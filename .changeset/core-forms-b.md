---
"fancy-ui-svelte": minor
---

The Core form controls that open a floating surface: `Select`, `Combobox`,
`Autocomplete`, `SearchInput`, `PasswordInput`, `FileUpload`, `DatePicker` and
`TimePicker`, plus `_internals/listbox`.

The listbox core gets two behaviours right once for the four components that
navigate a list, rather than four times: a run of consecutive disabled options is
skipped as a block, terminating rather than looping when every option is
disabled; and typeahead accumulates within a short window, with a repeated
character cycling through its matches the way a native select does.

`Combobox` and `Autocomplete` look alike and are not. `Combobox` is a closed set —
the value must be one of the options, and blur, Escape and outside click all
revert to the last valid selection. `Autocomplete` is an open field where any
text is valid, so arrowing only highlights rows and never writes into the input,
leaving Escape nothing to restore.

`DatePicker` builds on the calendar core rather than reimplementing month
arithmetic, keeps every date in local time end to end so no timestamp round trip
can shift the day, and derives every day cell's accessible name from `Intl` with
the caller's locale — a hardcoded month table is a bug in a library whose docs
ship sixteen languages. `TimePicker`'s value is always `"HH:mm"` in 24-hour form;
`hour12` changes the display only.

`FileUpload` validates `accept`, `maxSize` and `maxFiles` itself, because a
dropped file never passes through the input's own filter. Every rejection —
including files past the first on a single-file drop — is announced rather than
silently discarded.
