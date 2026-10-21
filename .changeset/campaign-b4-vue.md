---
"fancy-ui-vue": patch
---

Form contract for the action controls: Toggle takes `name`, `value` and `form` and submits `value` (default "on") through a hidden input while pressed, ToggleGroup takes `name` and `form` and submits one entry per selected value, and both keep their buttons at `type="button"`. Button, CopyButton and FollowButton behaviour is pinned by new form tests: `type`, `name`, `value`, `form` and `formaction` reach the native button, a loading Button never submits, CopyButton and FollowButton never submit, and `aria-invalid` passes through.

A Button rendered as a link keeps its `href` and its tab stop while `loading`, so keyboard focus is not lost mid-request; it is marked `aria-busy` and `aria-disabled` and its click and middle-click are blocked instead. The hidden input of Toggle now lives inside the button, so the component keeps a single root element. A selected ToggleGroupItem that is disabled on its own still submits; only a disabled group submits nothing.
