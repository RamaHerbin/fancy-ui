---
"fancy-ui-svelte": patch
---

Form contract for the action controls: Toggle takes `name`, `value` and `form` and submits `value` (default "on") through a hidden input while pressed, ToggleGroup takes `name` and `form` and submits one entry per selected value, and both keep their buttons at `type="button"`. Button, CopyButton and FollowButton behaviour is pinned by new form tests: `type`, `name`, `value`, `form` and `formaction` reach the native button, a loading Button never submits, CopyButton and FollowButton never submit, and `aria-invalid` passes through.
