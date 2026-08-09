---
"fancy-ui-svelte": minor
---

Core form primitives: `FormField`, `Label`, `Input`, `Textarea`, `Checkbox`,
`RadioGroup`, `Switch`, `Slider` and `NumberInput`.

`FormField` owns the wiring these controls otherwise make every caller repeat.
It generates the control's id, tracks which of the help and error text are
actually rendered, and publishes `aria-describedby`, `aria-invalid`, `required`
and `disabled` through context — so a control inside one needs no manual id
plumbing, and the same control outside one still works from its own props.

Every control is built on its native element rather than a restyled `div`, so
the browser supplies focus, keyboard behaviour and form submission: `RadioGroup`
inherits the platform's own roving tab stop from a shared `name`, and `Slider`
delegates its entire keyboard model to `input[type=range]`.

The context carries two labelling ids rather than one. A control whose root is a
labelable element is labelled through `controlId` and `<label for>`; a control
whose root is not — `RadioGroup`'s `div[role=radiogroup]` — points
`aria-labelledby` at `labelId` instead. `<label for>` only associates with
button, input, meter, output, progress, select and textarea, and an ARIA role
does not extend that list, so the group had no accessible name until this split
existed.
