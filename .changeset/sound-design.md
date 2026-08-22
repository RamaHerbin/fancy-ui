---
"fancy-ui-svelte": minor
---

Opt-in sound design. A `sound` controller synthesises eleven short interface
cues — hover, press, toggle on and off, open, close, select, success, error,
tick and copy — with the Web Audio API, so nothing is fetched and no audio file
ships. A `SoundToggle` switch carries the preference and volume, the
`soundFeedback` action wires cues to any element, and `Button`, `CopyButton`,
`Checkbox`, `Switch`, `RadioGroup`, `Select` and `DropdownMenu` accept a `sound`
prop to play the matching cue themselves.

Everything is silent until a user switches it on. The audio context is created
inside the gesture that enables it and resumed inside the gesture that plays,
never on import, mount, navigation or scroll; hover cues are rate-limited; and
the preference persists in `localStorage`, survives a corrupt or full store and
follows the user across tabs. The docs header gains the switch, and the Sound
page is a live lab for auditioning every cue with a note on when to use each one
and when not to.
