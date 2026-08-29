---
"fancy-ui-svelte": minor
---

Selects, comboboxes, autocompletes, and date and time pickers now animate out as well as in — the same 150 ms, from the same edge, in reverse. Dismissing stays immediate: the value, the change callback and `aria-expanded` all settle in the tick you act, and only the panel's removal from the page waits for the fade. A second Escape during that window is no longer swallowed by the panel already leaving — it reaches whatever sits underneath — and a panel reopened mid-fade continues from where it is rather than starting over. The panel reports `data-state="open"` while it is on screen and `data-state="closing"` on its way out, and stops taking clicks the moment it starts to leave. Under reduced motion nothing animates in either direction and the close is synchronous, exactly as before. Combobox's and Autocomplete's exported context types each gain a read-only `open` member, which the panel's own transition reads to tell an arrival from a departure.
