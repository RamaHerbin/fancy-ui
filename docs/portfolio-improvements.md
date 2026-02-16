# Portfolio - Improvements to Consider

## 1. Carbon Page: Performance Metrics Accuracy

**File:** `src/routes/portfolio/carbon/+page.svelte`

The performance metrics displayed on the carbon page (bundle size 45KB gzipped, FCP, Lighthouse score, CO2 per visit) may not reflect the actual implementation. The portfolio includes heavy interactive elements like FluidCursor, InteractiveGridPattern, ImageTrailCursor, and multiple animation libraries.

**Options:**
- Measure actual metrics with Lighthouse and update the values
- Label them as "targets" rather than current measurements
- Add a disclaimer that values are approximate and vary by page/device/connection

## 2. Testimonials: Stock Photos

**File:** `src/lib/portfolio/sections/Testimonials.svelte`

The testimonials currently use stock Unsplash images. Visitors may recognize these as generic stock photos, which could undermine credibility.

**Options:**
- Use actual profile photos (with permission from the people quoted)
- Use placeholder avatars/initials that don't pretend to be real photos
- Remove images entirely and rely on names and designations only
