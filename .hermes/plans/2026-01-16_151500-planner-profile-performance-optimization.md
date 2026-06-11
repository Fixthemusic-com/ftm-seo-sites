# Wedding Planner Intelligence Extraction — Performance Optimization

## Overview
This plan continues the implementation of `PlannerProfile` extraction with critical performance fixes discovered during the initial dry-run test.

## Original Plan
See: [2026-01-16_150500-planner-profile-extraction.md](./2026-01-16_150500-planner-profile-extraction.md)

## Dry-Run Test Results (January 2026)

### Initial Attempt
```bash
python manage.py extract_planner_intelligence --dry-run
```

**Outcome:** 
- Processed 2,488 planner emails successfully in Phase 1 (Discovery)
- **Stalled** on `qs.count()` call (COUNT query on 35k-message join)
- Previous version hit **85,000 database queries** (N+1 problem)

### Root Cause Analysis

**3 Performance Blockers:**

1. **COUNT Query Stall** (line 212)
   - After iterating through queryset with `.iterator()`, calling `qs.count()` 
     executes a separate COUNT query on the 35k-message join
   - This query blocks for extended time, causing timeout
   
2. **N+1 Band Lookups** (lines 279-281)
   ```python
   for enq in enquiries:
       for eb in EnquiryBand.objects.filter(enquiry=enq):  # N+1
           if eb.band_id:
               bands_booked.add(eb.band_id)
   ```
   
3. **N+1 Message Fetching** (lines 363-366)
   ```python
   for enq in enquiries:
       enquiry_bands = EnquiryBand.objects.filter(enquiry=enq)  # N+1
       for eb in enquiry_bands:
           msgs = EnquiryMessage.objects.filter(enquiryband=eb)  # N+1
   ```

## Performance Fixes Applied

### Fix 1: In-Memory Counter (Replace COUNT Query)
**File:** `booking/management/commands/extract_planner_intelligence.py:155-214`

**Before:**
```python
planners = {}
for msg in qs.iterator(chunk_size=500):
    # ... process messages ...

self.stdout.write(f"Scanned {qs.count()} IN messages...")
```

**After:**
```python
planners = {}
message_count = 0
for msg in qs.iterator(chunk_size=500):
    message_count += 1
    # ... process messages ...

self.stdout.write(f"Scanned {message_count} IN messages...")
```

**Impact:** Eliminates the COUNT query entirely. Uses O(1) memory for counter.

**Additional:** Added domain filtering to exclude FTM internal emails:
```python
.exclude(from_address__icontains="@fixthemusic.com")
.exclude(from_address__icontains="@musicians.fixthemusic.com")
```

### Fix 2: Batch Band Query (Eliminate N+1)
**File:** `booking/management/commands/extract_planner_intelligence.py:278-290`

**Before:**
```python
venue_ids = set()
bands_booked = set()
for enq in enquiries:
    if enq.location_place_id:
        venue_ids.add(enq.location_place_id)
    for eb in EnquiryBand.objects.filter(enquiry=enq):  # N+1
        if eb.band_id:
            bands_booked.add(eb.band_id)
```

**After:**
```python
venue_ids = set()
for enq in enquiries:
    if enq.location_place_id:
        venue_ids.add(enq.location_place_id)

# Batch query for bands (single query instead of N+1)
enquiry_ids = [e.id for e in enquiries]
bands_booked = set(
    EnquiryBand.objects.filter(
        enquiry_id__in=enquiry_ids
    ).exclude(
        band_id__isnull=True
    ).values_list("band_id", flat=True)
)
```

**Impact:** Reduces queries from O(N) to O(1) per planner. For 2,488 planners, 
saves ~2,488 queries.

### Fix 3: Batch Message Fetching (Eliminate N+1)
**File:** `booking/management/commands/extract_planner_intelligence.py:371-389`

**Before:**
```python
def get_all_messages_for_planner(self, enquiries):
    messages = []
    for enq in enquiries:
        enquiry_bands = EnquiryBand.objects.filter(enquiry=enq)  # N+1
        for eb in enquiry_bands:
            msgs = EnquiryMessage.objects.filter(enquiryband=eb)  # N+1
            messages.extend(msgs)
    return messages
```

**After:**
```python
def get_all_messages_for_planner(self, enquiries):
    enquiry_ids = [e.id for e in enquiries]
    if not enquiry_ids:
        return []
    
    # Single query: all messages for all enquiries
    return list(
        EnquiryMessage.objects.filter(
            enquiryband__enquiry_id__in=enquiry_ids
        ).select_related(
            "enquiryband__enquiry__band"
        ).order_by("created")
    )
```

**Impact:** Reduces queries from O(N²) to O(1) per planner. Critical for 
planners with 10+ enquiries.

## Query Count Comparison

**Scenario:** 2,488 planners, avg 14 enquiries each, avg 3 EnquiryBands per enquiry, 
avg 5 messages per EnquiryBand

**Before (N+1 version):**
- Discovery: 35,000 queries (one per message iteration)
- Per planner: 14 + 42 + 210 = **266 queries**
- Total: 35,000 + (2,488 × 266) = **~697,000 queries**

**After (Optimized):**
- Discovery: **1 query** (single iterator with select_related)
- Per planner: 2 queries (bands + messages)
- Total: 1 + (2,488 × 2) = **~4,977 queries**

**Reduction:** 99.3% fewer queries (697k → 5k)

## Execution Plan

### Step 1: Verify Model Exists
```bash
# Check if PlannerProfile model exists
cd /opt/data/workspace/ftm/backend
nix develop .#backend --command python manage.py shell -c "from booking.models import PlannerProfile; print(PlannerProfile.objects.count())"
```

If model doesn't exist, run migration:
```bash
nix develop .#backend --command python manage.py makemigrations booking --name add_planner_profile
nix develop .#backend --command python manage.py migrate
```

### Step 2: Dry-Run Validation
```bash
# Run dry-run to verify optimizations work
nix develop .#backend --command python manage.py extract_planner_intelligence --dry-run
```

**Expected:**
- Completes in < 30 seconds (down from timeout at 120s)
- Processes all 2,488 planners without stalling
- Outputs summary: venues, bands, website extraction stats

### Step 3: Full Extraction (Historical)
```bash
# Run full extraction with LLM intelligence
nix develop .#backend --command python manage.py extract_planner_intelligence --model deepseek/deepseek-v4-flash:nitro
```

**Expected:**
- Creates/updates ~2,488 PlannerProfile records
- LLM extraction: ~$2-5 USD in tokens (200 messages × 12k chars × 2,488 planners)
- Duration: ~30-60 minutes (rate-limited by LLM API)

### Step 4: Deploy Signal Handlers
Add signal handler to `booking/signals.py` for incremental updates:
```python
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import EnquiryMessage, PlannerExtractionQueue

@receiver(post_save, sender=EnquiryMessage)
def queue_planner_on_new_message(sender, instance, created, **kwargs):
    """Queue planner for extraction when new IN messages arrive."""
    if not created:
        return
    if instance.kind != EnquiryMessage.INCOMING:
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
    from booking.models import PlannerProfile
    existing = PlannerProfile.objects.filter(email=email).exists()
    
    if is_planner or existing:
        PlannerExtractionQueue.objects.update_or_create(
            email=email,
            defaults={'pending': True}
        )
```

### Step 5: Cron Job Setup
Daily batch processing at 3am (low traffic):
```python
# Add to hermes_cronjobs or systemd timer
{
    "name": "Extract Planner Intelligence",
    "schedule": "0 3 * * *",
    "command": "ftm-manage extract_planner_intelligence --queue",
    "enabled": True
}
```

### Step 6: Frontend Integration
Deploy planner listing and detail pages to SEO sites:
```bash
cd /opt/data/ftm-seo-sites
# Add planner routes to src/pages/wedding-planners/
# Add PlannerProfile API integration (similar to VenueProfile)
npx astro build
npx wrangler pages deploy dist --project-name=weddingbandsitaly --branch=staging
```

### Step 7: Exa Enrichment (Optional)
For planners with websites, enrich with Exa search:
```bash
# Create management command or standalone script
# Use Exa API to extract additional info from planner websites
# Similar to venue enrichment pattern
```

## Monitoring & Validation

### Metrics to Track
1. **Query performance**: Verify query count stays < 10k per full run
2. **Profile coverage**: Track % of `maybe_wedding_planner` enquiries with profiles
3. **Profile quality**: Average venues/bands per planner profile
4. **Extraction time**: Should complete in < 60 minutes
5. **LLM cost**: Monitor token usage (expect ~$2-5 per full run)

### Validation Queries
```python
# Profile coverage
from accounts.models import CustomUser
from booking.models import PlannerProfile

planner_users = CustomUser.objects.filter(maybe_wedding_planner=True).count()
planner_profiles = PlannerProfile.objects.count()
print(f"Coverage: {planner_profiles}/{planner_users} ({planner_profiles/planner_users*100:.1f}%)")

# Quality check
from django.db.models import Avg, Count
PlannerProfile.objects.annotate(
    venue_count=Count('venues_worked'),
    band_count=Count('bands_booked')
).aggregate(
    avg_venues=Avg('venue_count'),
    avg_bands=Avg('band_count')
)

# Extracted content quality
PlannerProfile.objects.exclude(bio='').count()  # Should be > 80%
PlannerProfile.objects.exclude(website='').count()  # Should be > 50%
```

## Open Questions

1. **Sluggify email addresses?** When planner name is missing, use email prefix 
   (e.g., `sarah@example.com` → slug `sarah`). Is this acceptable for public pages?

2. **Minimum threshold?** Require 3+ enquiries before creating profile? Or any 
   planner gets one immediately?

3. **Privacy**: Should bios mention specific couples/venues, or stay aggregated?

4. **Outreach timing**: When to start personalized email outreach to planners? 
   After 50 profiles? 100?

## Dependencies

- ✅ PlannerProfile model (may need migration)
- ✅ EnquiryMessage model with `from_address`, `kind`, `content_html`, `body_html`
- ✅ CustomUser.maybe_wedding_planner field
- ✅ OpenRouter API key (in /opt/data/.env)
- ✅ Exa API key (optional, for enrichment)

## Rollback Plan

If extraction produces poor results:
```python
# Delete all extracted profiles (keep model)
PlannerProfile.objects.all().delete()

# Truncate through tables
PlannerEnquiry.objects.all().delete()
PlannerVenueBooking.objects.all().delete()
PlannerBandBooking.objects.all().delete()

# Reset last_message_id to force re-extraction
# (profiles will be recreated on next run)
```

## Related Plans

- [Venue Intelligence System](./venue-intelligence-system.md) - Parallel extraction pattern
- [Exa Integration](./exa-integration.md) - Web enrichment strategy
- [Data Enrichment Pipelines](./data-enrichment-pipelines.md) - Standalone script patterns
