---
"fancy-ui-svelte": patch
"fancy-ui-react": patch
"fancy-ui-vue": patch
---

The light-theme `--muted-foreground` token is now darker (`oklch(0.5 0.046 257.417)`), so muted text keeps at least 4.5:1 on white, on the muted surface and on 5 to 7 % tinted backgrounds; the dark value did not change. Badge and Button now use a darker red for the destructive soft variant in the light theme (4.5:1 or more); the dark theme still uses `--destructive`. Slider's value bubble now reads its own `--ft-slider-bubble-fg` (the foreground colour) instead of the cyan fill end, which stays on the fill. Step descriptions and SidebarGroup labels are no longer dimmed with an opacity modifier (the sidebar label is 11px instead of 10px), CodeDiff line numbers are brighter, Timeline's muted text is stronger in both themes, and the marquee ReviewCard muted text now has a separate value per theme.
