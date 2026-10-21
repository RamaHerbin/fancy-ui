---
"fancy-ui-svelte": patch
"fancy-ui-react": patch
"fancy-ui-vue": patch
---

Checkbox, Switch, Slider, RadioGroup, RadioGroupItem and FileUpload now forward native attributes and listeners to their focusable element (the input, or the radiogroup root for RadioGroup), so `aria-*`, `data-*`, `form` and `onblur`-style handlers reach it and the control can join a form.
