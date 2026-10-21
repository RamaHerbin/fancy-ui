---
"fancy-ui-svelte": patch
"fancy-ui-react": patch
"fancy-ui-vue": patch
---

Triggers and items now forward native attributes and listeners to the element they render: `DropdownMenuTrigger`, `DropdownMenuItem` and `DropdownMenuSubTrigger`, `TabsTrigger`, `NavigationMenuTrigger`, `SourcesTrigger`, `ToggleGroupItem`, `Toggle`, the `Popover` trigger, `ComposerSubmit`, `ComposerModelPicker` and `ComposerInput` (its textarea). `id`, `data-*`, `aria-*` and listeners such as `onfocus` or `onkeydown` reach the button, menu item, tab or textarea; the managed ARIA and state attributes (`role`, `aria-expanded`, `aria-pressed`, `aria-selected`, the roving `tabindex`) stay the component's, and a consumer `onclick` runs once after the component's own handling and not while the part is disabled.

React Toggle: `type` and `aria-pressed` can no longer be overridden by props, and `onClick` now runs after `onPressedChange`.
