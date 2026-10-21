---
"fancy-ui-svelte": patch
"fancy-ui-react": patch
"fancy-ui-vue": patch
---

Select, DatePicker and TimePicker now forward native attributes and listeners to their trigger button, and Combobox and Autocomplete to their text input. A consumer `aria-describedby` merges with the FormField's, `form` reaches the hidden submission input, and the managed ARIA stays the component's own.
