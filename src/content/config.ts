import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.date(),
    author: z.string().default('Editorial Team'),
    image: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const locations = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    region: z.string(),
    regionName: z.string(),
    regionId: z.number(),
    heroTitle: z.string(),
    heroSubtitle: z.string(),
    featuredLocation: z.string(),
    lat: z.number(),
    lng: z.number(),
    publishDate: z.date(),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { blog, locations };
