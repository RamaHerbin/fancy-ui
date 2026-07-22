---
"fancy-ui-svelte": patch
---

fix(docs Sidebar): keep the sidebar docked on desktop under RTL locales

Under RTL locales (`ar`, `fa`) the docs sidebar was pushed off-screen on desktop (`lg`+), leaving an empty `ps-64` gutter and no navigation. The desktop docking utility `lg:translate-x-0` and the mobile-drawer RTL transform `rtl:translate-x-full` compile to equal-specificity rules, so source order decides — and `rtl:translate-x-full` is emitted later, winning on RTL desktop. Adding an RTL-aware desktop override (`rtl:lg:translate-x-0`) restores the docked sidebar (mirrored to the right) while leaving the mobile drawer behaviour unchanged. Docs-site only — no change to the published component API.
