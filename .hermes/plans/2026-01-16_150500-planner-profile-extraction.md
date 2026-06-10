# Wedding Planner Intelligence Extraction

## Overview
Build a `PlannerProfile` model (parallel to `VenueProfile`) that extracts structured intelligence from email correspondence with wedding planners. Planners are identified via `user.maybe_wedding_planner` on the CustomUser model.

## Data Model Facts (verified against codebase June 2026)

### Key Distinction from Venue Intelligence
- `maybe_wedding_planner` is on **CustomUser** (`accounts/models.py:50`), NOT on Enquiry (removed in migration `0110`)
- Access: `enquiry.user.maybe_wedding_planner`
- There is **no `contact_email` field** on Enquiry. Client email is `enquiry.user.email`
- EnquiryMessage has `from_address` (CharField) — the actual sender email on each message
- EnquiryMessage.kind: `INCOMING = 'IN'`, `OUTGOING = 'OU'`, `AUTOMATED = 'AU'`
- EnquiryMessage links through **EnquiryBand** (not directly to Enquiry): `EnquiryMessage → EnquiryBand → Enquiry`

### Planner Email Extraction (CRITICAL)
The planner's email comes from `EnquiryMessage.from_address` where `kind='IN'` (INCOMING).
Do NOT use `enquiry.user.email` — that's the account registration address, which may differ
from the planner's actual sending address. Multiple email addresses per planner are possible
(assistants, shared inboxes).

```python
# Correct extraction query chain:
from booking.models import Enquiry, EnquiryBand, EnquiryMessage

enquiries = Enquiry.objects.filter(
    user__maybe_wedding_planner=True
).select_related('user', 'band')

for enq in enquiries:
    enquiry_bands = EnquiryBand.objects.filter(enquiry=enq)
    for eb in enquiry_bands:
        incoming_messages = EnquiryMessage.objects.filter(
            enquiryband=eb,
            kind=EnquiryMessage.INCOMING  # 'IN'
        )
        for msg in incoming_messages:
            planner_email = msg.from_address  # THIS is the planner's email
```

## Business Value
- **SEO backlinks**: Planners will link to their profile pages from their websites (separate channel from venue links)
- **Network intelligence**: Understand planner-venue-band relationships
- **Outreach**: Personalised emails to planners with their verified event history
- **Data moat**: No other platform has verified planner track records

## Data Model

### PlannerProfile (new model)
```python
class PlannerProfile(models.Model):
    # Identification
    email = models.EmailField(unique=True, db_index=True,
        help_text="Primary email from EnquiryMessage.from_address (kind='IN')")
    name = models.CharField(max_length=255, blank=True)
    company_name = models.CharField(max_length=255, blank=True)
    
    # Contact enrichment (from Exa/Google/email signatures)
    website = models.URLField(blank=True,
        help_text="Extracted from email signature or Exa search")
    phone = models.CharField(max_length=50, blank=True)
    location = models.CharField(max_length=255, blank=True)
    social_links = models.JSONField(default=list, blank=True,
        help_text="List of {platform, url} from email signatures")
    
    # FTM account links — a planner may have multiple accounts (personal, team)
    users = models.ManyToManyField('accounts.CustomUser', blank=True,
        related_name='planner_profiles',
        help_text="All CustomUser accounts linked to this planner")
    
    # Intelligence from correspondence
    bio = models.TextField(blank=True)  # LLM-synthesised professional bio
    editorial_summary = models.TextField(blank=True)  # Logistics notes, specialties
    specialties = ArrayField(
        models.CharField(max_length=100),
        blank=True,
        default=list,
        help_text="Music types, venue types, event styles"
    )
    regions = ArrayField(
        models.CharField(max_length=100),
        blank=True,
        default=list,
        help_text="Geographic coverage"
    )
    
    # Booking statistics
    total_enquiries = models.PositiveIntegerField(default=0)
    total_bookings = models.PositiveIntegerField(default=0)
    
    # M2M through tables
    venues_worked = models.ManyToManyField(
        'VenueProfile',
        through='PlannerVenueBooking',
        blank=True
    )
    bands_booked = models.ManyToManyField(
        'Band',
        through='PlannerBandBooking',
        blank=True
    )
    enquiries = models.ManyToManyField(
        'Enquiry',
        through='PlannerEnquiry',
        blank=True,
        help_text="All enquiries attributed to this planner, with booking metadata"
    )
    
    # Extraction tracking
    extracted_at = models.DateTimeField(null=True, blank=True)
    last_message_id = models.PositiveIntegerField(default=0,
        help_text="Highest EnquiryMessage.id processed (for incremental updates)")
    
    # SEO
    slug = models.SlugField(unique=True, max_length=255)
    
    class Meta:
        ordering = ['-total_bookings']
```

### Through models

```python
class PlannerEnquiry(models.Model):
    """Links a PlannerProfile to an Enquiry with booking metadata."""
    planner = models.ForeignKey(PlannerProfile, on_delete=models.CASCADE)
    enquiry = models.ForeignKey('booking.Enquiry', on_delete=models.CASCADE)
    
    # Booking outcome
    converted = models.BooleanField(
        help_text="Mirror of enquiry.converted — denormalised for queryability")
    event_date = models.DateField(null=True, blank=True)
    region = models.CharField(max_length=100, blank=True,
        help_text="Cached from enquiry.location or venue.region")
    
    # Message stats
    incoming_message_count = models.PositiveIntegerField(default=0,
        help_text="Messages where from_address matches planner and kind='IN'")
    first_message_date = models.DateTimeField(null=True, blank=True)
    last_message_date = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ('planner', 'enquiry')
        ordering = ['-event_date']


class PlannerVenueBooking(models.Model):
    planner = models.ForeignKey(PlannerProfile, on_delete=models.CASCADE)
    venue = models.ForeignKey('VenueProfile', on_delete=models.CASCADE)
    booking_count = models.PositiveIntegerField(default=0)
    latest_booking = models.DateField(null=True, blank=True)
    
    class Meta:
        unique_together = ('planner', 'venue')

class PlannerBandBooking(models.Model):
    planner = models.ForeignKey(PlannerProfile, on_delete=models.CASCADE)
    band = models.ForeignKey('bands.Band', on_delete=models.CASCADE)
    booking_count = models.PositiveIntegerField(default=0)
    latest_booking = models.DateField(null=True, blank=True)
    
    class Meta:
        unique_together = ('planner', 'band')
```

## Extraction Pipeline

### Phase 1: Discovery & Grouping
```python
from booking.models import Enquiry, EnquiryBand, EnquiryMessage

def discover_planners():
    """Find all planner-marked enquiries, extract planner emails from IN messages, group by email."""
    enquiries = Enquiry.objects.filter(
        user__maybe_wedding_planner=True
    ).select_related('user', 'band').order_by('id')

    planners = {}  # keyed by normalised from_address
    for enq in enquiries:
        enquiry_bands = EnquiryBand.objects.filter(enquiry=enq)
        for eb in enquiry_bands:
            msgs = EnquiryMessage.objects.filter(
                enquiryband=eb,
                kind=EnquiryMessage.INCOMING  # 'IN'
            ).exclude(from_address__isnull=True).exclude(from_address='')

            for msg in msgs:
                email = msg.from_address.lower().strip()
                if not email:
                    continue

                if email not in planners:
                    planners[email] = {
                        'email': email,
                        'enquiries': set(),
                        'latest_id': 0,
                    }
                planners[email]['enquiries'].add(enq)
                planners[email]['latest_id'] = max(planners[email]['latest_id'], enq.id)

    # Convert sets to sorted lists for stable ordering
    for data in planners.values():
        data['enquiries'] = sorted(data['enquiries'], key=lambda e: e.id)

    return planners
```

### Phase 2: Profile Creation/Update
```python
def create_or_update_profile(planner_data):
    """Create new profile or update existing with new enquiries."""
    email = planner_data['email']
    enquiries = planner_data['enquiries']
    messages = planner_data.get('messages', [])  # all IN messages for this planner
    
    # Check if profile exists
    try:
        profile = PlannerProfile.objects.get(email=email)
        existing = True
    except PlannerProfile.DoesNotExist:
        profile = PlannerProfile(email=email)
        existing = False
    
    # Determine if re-extraction is needed
    max_message_id = max(m.id for m in messages) if messages else 0
    should_extract = (
        not existing
        or profile.last_message_id < max_message_id
        or not profile.name  # name extraction failed previously
    )
    
    if should_extract:
        # Collect ALL messages (IN + OU) for LLM context
        all_messages_for_enquiry = []
        for enq in enquiries:
            for eb in EnquiryBand.objects.filter(enquiry=enq):
                msgs = EnquiryMessage.objects.filter(enquiryband=eb).order_by('created')
                all_messages_for_enquiry.extend(msgs)
        
        # LLM extraction from full correspondence
        extracted = extract_planner_intelligence(all_messages_for_enquiry)
        profile.name = extracted.get('name', '')
        profile.company_name = extracted.get('company', '')
        profile.bio = extracted.get('bio', '')
        profile.specialties = extracted.get('specialties', [])
        profile.regions = extracted.get('regions', [])
        profile.slug = slugify(profile.name or email.split('@')[0])
    
    # Extract website from email signatures (doesn't need LLM)
    if not profile.website:
        profile.website = extract_website_from_signatures(messages)
    
    # Extract social links from signatures
    if not profile.social_links:
        profile.social_links = extract_social_from_signatures(messages)
    
    # Aggregate booking stats
    profile.total_enquiries = len(enquiries)
    profile.total_bookings = sum(1 for e in enquiries if e.converted)
    profile.last_message_id = max_message_id
    profile.extracted_at = timezone.now()
    profile.save()
    
    # Link CustomUser accounts
    for enq in enquiries:
        if enq.user:
            profile.users.add(enq.user)
    
    # Update through-tables
    update_planner_enquiries(profile, enquiries, messages)
    update_planner_relationships(profile, enquiries)
    
    return profile


def extract_website_from_signatures(messages):
    """Parse website URL from email signatures in message HTML.
    
    content_html is the cleanest source (raw incoming email HTML).
    body_html accumulates reply threads so has more signature instances.
    """
    import re
    from urllib.parse import urlparse
    
    # Collect all HTML content from messages
    html_bodies = []
    for msg in messages:
        if msg.content_html:
            html_bodies.append(msg.content_html)
        elif msg.body_html:
            html_bodies.append(msg.body_html)
    
    if not html_bodies:
        return ''
    
    # Extract all URLs from the HTML
    url_pattern = re.compile(r'href=["\']([^"\']+)["\']', re.IGNORECASE)
    domain_counts = {}
    
    for html in html_bodies:
        urls = url_pattern.findall(html)
        for url in urls:
            try:
                parsed = urlparse(url)
                domain = parsed.netloc.lower()
                if not domain:
                    continue
                # Skip common non-website links
                if any(skip in domain for skip in [
                    'gmail.com', 'outlook.com', 'yahoo.', 'hotmail.',
                    'google.com', 'microsoft.com', 'apple.com',
                    'facebook.com', 'instagram.com', 'twitter.com',
                    'linkedin.com', 'youtube.com', 'tiktok.com',
                    'mailchimp.com', 'sendgrid.net', 'mailgun',
                    'unsubscribe', 'privacy', 'tracking'
                ]):
                    continue
                if domain not in domain_counts:
                    domain_counts[domain] = 0
                domain_counts[domain] += 1
            except Exception:
                continue
    
    # Most frequent non-social domain is likely their website
    if domain_counts:
        top_domain = max(domain_counts, key=domain_counts.get)
        if domain_counts[top_domain] >= 2:  # Appeared in 2+ signatures
            return f"https://{top_domain}"
    
    return ''


def extract_social_from_signatures(messages):
    """Extract social media links from email signatures."""
    import re
    
    social_patterns = {
        'instagram': r'instagram\.com/([a-zA-Z0-9_.]+)',
        'facebook': r'facebook\.com/([a-zA-Z0-9_.]+)',
        'linkedin': r'linkedin\.com/(?:in|company)/([a-zA-Z0-9_-]+)',
        'twitter': r'(?:twitter|x)\.com/([a-zA-Z0-9_]+)',
        'tiktok': r'tiktok\.com/@([a-zA-Z0-9_.]+)',
        'pinterest': r'pinterest\.com/([a-zA-Z0-9_.]+)',
    }
    
    results = []
    seen = set()
    
    for msg in messages:
        html = msg.content_html or msg.body_html or ''
        for platform, pattern in social_patterns.items():
            matches = re.findall(pattern, html)
            for match in matches:
                key = f"{platform}:{match}"
                if key not in seen:
                    seen.add(key)
                    results.append({'platform': platform, 'handle': match})
    
    return results
```

### Phase 3: LLM Intelligence Extraction
```python
def extract_planner_intelligence(enquiries):
    """Use LLM to extract planner details from correspondence."""
    # Collect all messages
    all_messages = []
    for enq in enquiries:
        messages = Message.objects.filter(enquiry=enq).order_by('created')
        all_messages.extend([(m.sender, m.body) for m in messages])
    
    # Format for LLM
    conversation = '\n'.join([
        f"{sender}: {body}" for sender, body in all_messages[:200]  # Limit
    ])
    
    prompt = f"""You are a wedding industry analyst. Extract structured information about the wedding planner from this correspondence.

Conversation with {len(enquiries)} enquir{'y' if len(enquiries) == 1 else 'ies'}:
{conversation}

Extract:
1. Planner's full name (if mentioned)
2. Company/business name (if mentioned)
3. Professional bio (2-3 sentences about their work based on correspondence)
4. Specialties (music types, venue types, event styles they work with)
5. Geographic regions they cover
6. Communication style notes (formal/casual, detail-oriented, etc.)

Return JSON:
{{
  "name": "...",
  "company": "...",
  "bio": "...",
  "specialties": ["...", "..."],
  "regions": ["...", "..."],
  "editorial_notes": "..."
}}

If information isn't available, use empty strings or empty arrays.
Base extraction ONLY on what's mentioned in the correspondence. Don't speculate."""

    response = openrouter_chat(
        model="deepseek/deepseek-v4-flash:nitro",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3
    )
    
    return parse_json_response(response)
```

### Phase 4: Relationship Aggregation
```python
def update_planner_enquiries(profile, enquiries, messages):
    """Update PlannerEnquiry through-table for each linked enquiry."""
    # Build a lookup: enquiry_id → messages from this planner
    enquiry_message_map = {}
    for msg in messages:
        enq_id = msg.enquiryband.enquiry_id
        if enq_id not in enquiry_message_map:
            enquiry_message_map[enq_id] = []
        enquiry_message_map[enq_id].append(msg)
    
    for enq in enquiries:
        msgs = enquiry_message_map.get(enq.id, [])
        first_date = min(m.created for m in msgs) if msgs else None
        last_date = max(m.created for m in msgs) if msgs else None
        
        # Determine region from enquiry location
        region = ''
        if enq.location_place_id:
            # Try to resolve region from venue profile if available
            try:
                vp = VenueProfile.objects.get(place_id=enq.location_place_id)
                region = vp.region.name if vp.region else ''
            except VenueProfile.DoesNotExist:
                pass
        
        PlannerEnquiry.objects.update_or_create(
            planner=profile,
            enquiry=enq,
            defaults={
                'converted': bool(enq.converted),
                'event_date': enq.event_date,
                'region': region,
                'incoming_message_count': len(msgs),
                'first_message_date': first_date,
                'last_message_date': last_date,
            }
        )


def update_planner_relationships(profile, enquiries):
    """Update many-to-many relationships from enquiries."""
    # Aggregate venue data
    venue_stats = {}
    for enq in enquiries:
        if enq.venue:
            venue_id = enq.venue.id
            if venue_id not in venue_stats:
                venue_stats[venue_id] = {'count': 0, 'latest': None}
            venue_stats[venue_id]['count'] += 1
            if enq.event_date and (
                not venue_stats[venue_id]['latest'] or
                enq.event_date > venue_stats[venue_id]['latest']
            ):
                venue_stats[venue_id]['latest'] = enq.event_date
    
    # Update planner-venue relationships
    for venue_id, stats in venue_stats.items():
        PlannerVenueBooking.objects.update_or_create(
            planner=profile,
            venue_id=venue_id,
            defaults={
                'booking_count': stats['count'],
                'latest_booking': stats['latest']
            }
        )
    
    # Aggregate band data (similar logic)
    band_stats = {}
    for enq in enquiries:
        if enq.band:
            band_id = enq.band.id
            if band_id not in band_stats:
                band_stats[band_id] = {'count': 0, 'latest': None}
            band_stats[band_id]['count'] += 1
            if enq.event_date and (
                not band_stats[band_id]['latest'] or
                enq.event_date > band_stats[band_id]['latest']
            ):
                band_stats[band_id]['latest'] = enq.event_date
    
    for band_id, stats in band_stats.items():
        PlannerBandBooking.objects.update_or_create(
            planner=profile,
            band_id=band_id,
            defaults={
                'booking_count': stats['count'],
                'latest_booking': stats['latest']
            }
        )
```

## Exa Enrichment (Optional)

For planners with a website, enrich with Exa search similar to venue descriptions:

```python
def enrich_planner_web_presence(profile):
    """Search for planner's website and extract additional info."""
    if not profile.name:
        return
    
    query = f"{profile.name} {profile.company_name} wedding planner Italy"
    results = exa_search(query, num_results=3)
    
    for result in results:
        if profile.company_name.lower() in result['text'].lower():
            # Found their website
            profile.website = result['url']
            # Optionally: LLM extract additional info from page
            break
```

## Management Command

```python
# booking/management/commands/extract_planner_intelligence.py

class Command(BaseCommand):
    help = 'Extract wedding planner intelligence from correspondence'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            help='Process only this planner email'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Re-extract even if profile is up to date'
        )
    
    def handle(self, *args, **options):
        # Discover planners
        planners = discover_planners()
        self.stdout.write(f"Found {len(planners)} unique planners")
        
        # Process each
        for email, data in planners.items():
            if options['email'] and email != options['email']:
                continue
            
            self.stdout.write(f"\nProcessing {email} ({len(data['enquiries'])} enquiries)")
            
            profile = create_or_update_profile(data)
            self.stdout.write(f"  ✓ {profile.name or 'Unnamed'}")
            self.stdout.write(f"    {profile.total_bookings} bookings, {profile.venues_worked.count()} venues")
            self.stdout.write(f"    Slug: /wedding-planners/{profile.slug}/")
```

## Frontend Pages

### Planner Listing (`/wedding-planners/`)
```astro
---
const planners = await getPlanners({ limit: 100 })
---

<BaseLayout>
  <h1>Wedding Planners in Italy</h1>
  <p>Verified event history from {planners.length} wedding planners</p>
  
  <div class="grid">
    {planners.map(planner => (
      <PlannerCard
        name={planner.name}
        company={planner.company_name}
        bookings={planner.total_bookings}
        venues={planner.venues_worked_count}
        href={`/wedding-planners/${planner.slug}/`}
      />
    ))}
  </div>
</BaseLayout>
```

### Planner Detail (`/wedding-planners/[slug].astro`)
```astro
---
const planner = await getPlanner(slug)
const venues = await getPlannerVenues(planner.id)
const bands = await getPlannerBands(planner.id)
---

<BaseLayout>
  <h1>{planner.name}</h1>
  <p class="company">{planner.company_name}</p>
  
  <div class="bio">{planner.bio}</div>
  
  <div class="stats">
    <Stat value={planner.total_bookings} label="Events" />
    <Stat value={venues.length} label="Venues" />
    <Stat value={bands.length} label="Bands" />
  </div>
  
  <section class="venues">
    <h2>Venues We've Worked</h2>
    <VenueGrid venues={venues} />
  </section>
  
  <section class="bands">
    <h2>Bands We've Booked</h2>
    <BandGrid bands={bands} />
  </section>
  
  <section class="reviews">
    <h2>Couple Reviews</h2>
    <!-- Reviews that mention this planner -->
  </section>
  
  <!-- Schema.org -->
  <script type="application/ld+json" set:html={JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Person",
    "name": planner.name,
    "jobTitle": "Wedding Planner",
    "worksFor": { "@type": "Organization", "name": planner.company_name },
    "url": `https://${siteConfig.domain}/wedding-planners/${planner.slug}/`
  })} />
</BaseLayout>
```

## Future Enquiry Handling

### Incremental Updates
New enquiries flow in continuously. The system needs to:

1. **Queue new planners**: When an EnquiryMessage with `kind='IN'` arrives from a planner, queue it:
   ```python
   def on_message_saved(sender, instance, **kwargs):
       if instance.kind != EnquiryMessage.INCOMING:
           return
       if not instance.from_address:
           return
       # Check if this planner already has a profile
       email = instance.from_address.lower().strip()
       if not email:
           return
       existing = PlannerProfile.objects.filter(email=email).exists()
       if existing:
           # Mark for incremental update (new messages arrived)
           PlannerExtractionQueue.objects.update_or_create(
               email=email,
               defaults={'pending': True}
           )
   
   # Connect to EnquiryMessage post_save signal
   ```

2. **Also detect NEW planners** from incoming messages on planner-marked users:
   ```python
   def on_enquiry_message_saved(sender, instance, created, **kwargs):
       if not created or instance.kind != EnquiryMessage.INCOMING:
           return
       # Check if the enquiry's user is a wedding planner
       try:
           enq = instance.enquiryband.enquiry
           if enq.user and enq.user.maybe_wedding_planner:
               email = (instance.from_address or '').lower().strip()
               if email:
                   PlannerExtractionQueue.objects.update_or_create(
                       email=email,
                       defaults={'pending': True}
                   )
       except (AttributeError, EnquiryBand.DoesNotExist):
           pass
   ```

3. **Batch processing**: Hourly/daily cron job:
   ```bash
   ftm-manage extract_planner_intelligence --queue
   ```
   This processes all emails in PlannerExtractionQueue where `pending=True`,
   then marks them `pending=False`.

4. **Skip if complete**: Incremental logic uses `last_message_id`:
   ```python
   def needs_reextraction(profile, new_enquiry):
       # Re-extract if new enquiry adds new venue or band relationship
       existing_venues = set(profile.venues_worked.values_list('id', flat=True))
       existing_bands = set(profile.bands_booked.values_list('id', flat=True))
       return (
           new_enquiry.location_place_id not in existing_venue_place_ids or
           (new_enquiry.enquiryband_set.filter().values_list('band_id', flat=True)
            - existing_bands)
       )
   ```

## Review Integration

### Extract planner mentions from couple reviews
Reviews mention planners in `event_string` or review text:

```python
def link_reviews_to_planners():
    """Link band reviews to planner profiles when planner is mentioned."""
    reviews = BandReview.objects.filter(
        planner_profiles__isnull=True  # Not yet linked
    )
    
    for review in reviews:
        # Search for planner email/name in review text
        planner_mentions = PlannerProfile.objects.filter(
            Q(email__iexact=review.planner_email_mentioned) |
            Q(name__icontains=review.planner_name_mentioned)
        )
        
        for planner in planner_mentions:
            review.planner_profiles.add(planner)
```

## Migration Strategy

### Step 1: Create models
```bash
ftm-manage makemigrations booking --name add_planner_profile
ftm-manage migrate
```

### Step 2: Historical extraction
```bash
# Extract from all existing enquiries
ftm-manage extract_planner_intelligence

# Expected output:
# Found 85 unique planners
# Processing planner1@example.com (12 enquiries)
#   ✓ Sarah Johnson
#     8 bookings, 5 venues
# Processing planner2@example.com (7 enquiries)
#   ✓ Marco Rossi
#     3 bookings, 2 venues
# ...
```

### Step 3: Deploy frontend
```bash
cd /opt/data/ftm-seo-sites
npx astro build
npx wrangler pages deploy dist --project-name=weddingbandsitaly --branch=staging
```

### Step 4: Add signal handlers for future messages
Add to `booking/signals.py`:
```python
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import EnquiryMessage, PlannerExtractionQueue

@receiver(post_save, sender=EnquiryMessage)
def queue_planner_on_new_message(sender, instance, created, **kwargs):
    """Queue planner for extraction when new IN messages arrive."""
    if not created:
        return
    if instance.kind != EnquiryMessage.INCOMING:  # 'IN'
        return
    email = (instance.from_address or '').lower().strip()
    if not email:
        return
    
    # Check if this is from a wedding planner user
    try:
        enq = instance.enquiryband.enquiry
        is_planner = enq.user and enq.user.maybe_wedding_planner
    except Exception:
        is_planner = False
    
    # Also queue if profile already exists (incremental update)
    existing = PlannerProfile.objects.filter(email=email).exists()
    
    if is_planner or existing:
        PlannerExtractionQueue.objects.update_or_create(
            email=email,
            defaults={'pending': True}
        )
```

### Step 5: Set up cron job
Daily batch processing:
```python
# hermes_cronjobs.py
{
    "name": "Extract Planner Intelligence",
    "schedule": "0 3 * * *",  # 3am daily
    "command": "ftm-manage extract_planner_intelligence --queue",
    "enabled": True
}
```

## Success Metrics

1. **Profile coverage**: % of `maybe_wedding_planner` enquiries with profiles
2. **Profile quality**: Avg venues/bands per planner
3. **SEO impact**: Planner pages indexed, backlinks from planner websites
4. **Outreach conversion**: Planner response rate to personalised emails

## Dependencies

- `maybe_wedding_planner` field on Enquiry ✓ (assumed exists)
- Exa API key in `/opt/data/.env` ✓
- OpenRouter API key ✓
- VenueProfile model ✓
- Band model ✓
- Enquiry/BandReview models ✓

## Open Questions

1. **Planner email matching**: Should we fuzzy-match similar emails? (e.g., `sarah@planner.it` vs `sarah.johnson@planner.it`)
2. **Minimum threshold**: Require 3+ enquiries before creating profile? Or any planner gets one?
3. **Privacy**: Should planner bios mention specific couples/venues, or stay aggregated?
4. **Outreach timing**: When to start email outreach? After 50 profiles? 100?

## Related

- [Venue Intelligence](./venue-intelligence.md) - Parallel extraction pattern
- [Exa Integration](./exa-integration.md) - Web enrichment strategy
- [Data Enrichment Pipelines](./data-enrichment-pipelines.md) - Standalone script patterns
