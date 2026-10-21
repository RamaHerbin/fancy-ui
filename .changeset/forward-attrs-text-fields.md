---
"fancy-ui-svelte": patch
"fancy-ui-react": patch
"fancy-ui-vue": patch
---

Input, Textarea, PasswordInput, SearchInput and NumberInput now forward native attributes and listeners (`id`, `name`, `form`, `inputmode`, `data-*`, `aria-*`, `onblur`, `onkeydown`, `oninput`, `onchange` and the like) to their inner `<input>` / `<textarea>`; a consumer `aria-describedby` is merged with the component's own description id.
