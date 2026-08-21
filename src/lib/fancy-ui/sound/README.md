# Sound

Opt-in interface sound: a controller that synthesises short cues with the Web
Audio API, a `SoundToggle` switch that owns the on/off + volume preference,
and a `soundFeedback` action that wires cues to any element without touching
its markup. Nothing is audible until a person turns sound on for themselves —
there is no cue on mount, on route change, on scroll, or from any component
whose own `sound` prop is left at its default.

```svelte
<!-- somewhere a person can reach, e.g. a settings panel or the header -->
<script>
	import { SoundToggle } from "fancy-ui-svelte";
</script>

<SoundToggle showLabel />
```

```ts
import { sound } from "fancy-ui-svelte";

sound.play("success");
```

`sound.play()` works from anywhere — an event handler, a promise resolution,
code with no component in scope — with no `<SoundToggle>` mounted anywhere.
Like `toast`, the controller is a module-level singleton for exactly that
reason: one preference, one engine, shared by however many places in the tree
read or trigger it.

## The silence contract

Sound in this library is a feature a person switches on, never one that
switches itself on for them:

- **Opt-in, off by default.** `SoundPreferences.enabled` starts `false`.
  Nothing plays until a person flips `SoundToggle`, or calls `sound.enable()`
  themselves, on their own device.
- **The AudioContext is only ever created inside a gesture.** Nothing
  constructs one at import, on mount, or on a route change. `enable()` (and
  therefore `toggle()` and `setEnabled(true)`, which route through it) calls
  `unlock()`, which creates/resumes the context inside the enabling click —
  the click is the gesture, nothing is speculative. `play()` itself only
  reaches the audio context from inside a user activation.
- **At most one cue waits for the context; bursts are never queued.** If the
  context is still idle, suspended, or blocked by an earlier rejected resume
  when a cue arrives (the first click after a cold load, a backgrounded tab,
  iOS Safari's own rules), `play()` unlocks inside that same gesture and
  replays exactly that one cue — the newest one — once the context runs. Cues dropped for any other reason
  (rate limit, voice cap, sound off) stay dropped, so there is never a
  backlog of silenced cues firing at once.
- **Every cue is rate-limited per cue, independent of the action layer's own
  guards.** `hover` is capped at 60ms, `tick`/`select` at 40ms, everything
  else at 15ms — see `SOUND_MIN_INTERVAL_MS`. A hover storm from a fast mouse
  sweep, or key autorepeat landing on `select`, thins itself out instead of
  turning into a buzz.
- **`play()` is a no-op — never a throw — while off, unsupported, or before
  hydration.** Every Web Audio and storage failure is swallowed into
  `sound.status`, never thrown and never logged in production paths. Reading
  a status field or calling a method is always safe, on the server and in the
  browser, whether or not sound will ever actually be audible in this tab.

## Persistence

The preference is one JSON object under `localStorage["fancy-ui-sound"]`:

```json
{ "v": 1, "enabled": false, "volume": 0.5, "theme": "fancy" }
```

- **Corrupt or foreign JSON silently becomes the defaults.**
  `parseStoredPreferences` never throws — malformed JSON, a missing/mismatched
  `v`, an out-of-range `volume`, or an unknown `theme` all fall back to
  `DEFAULT_SOUND_PREFERENCES` field by field, rather than rejecting the whole
  object over one bad field.
- **A storage failure (quota, private browsing, a blocked origin) never
  blocks the preference from changing in memory.** `sound.status.storage`
  reports `"ok"`, `"unavailable"` (read failed) or `"error"` (write failed,
  with the message in `status.lastError`) so a status line can say so, but
  `sound.enabled`/`volume`/`theme` always reflect what was just set — a
  person who flips the switch sees it flip, even in a tab that can't
  remember it for next time.
- **Cross-tab sync, read-only.** A `storage` event for this library's key
  updates this tab's preferences and mirrors volume/theme into the engine,
  but never writes back — the tab that changed the value already persisted
  it; echoing it back would loop. A `storage` event with `key === null`
  (what `localStorage.clear()` fires) resets this tab back to the defaults,
  matching what actually happened to the stored value.
- **Hydration is lazy and happens exactly once per module instance.**
  Nothing in `sound/` touches `localStorage`, `AudioContext`, or any other
  browser global at import time — not the barrel, not `sound.svelte.ts`, not
  `createSoundEngine()` itself. The first getter or method call on `sound`
  reads storage once, probes Web Audio support once (without constructing a
  context), and attaches the cross-tab listener once; every call after that
  is instant. This is what makes it safe for the whole family to sit in the
  package barrel a server-rendered app always imports.

## Accessibility

- **`SoundToggle` is a real switch**, `role="switch"` with `aria-checked`
  carrying the state — never a visual-only toggle. Its accessible name
  (`label`, default `"Sound"`) stays constant across on/off; the state is
  announced through `aria-checked`, not by swapping the name to "Sound is
  on"/"Sound is off". Both the "on" and "off" glyphs are always present in
  the DOM, switched by `data-state` in CSS rather than an `{#if}` at the
  root — so a page that rendered "off" on the server and reads "on" from
  storage the moment it hydrates never flashes the wrong icon or briefly
  ships an empty button.
- **Sound is never the only carrier of meaning.** Every place a cue plays —
  a toggle flipping, a copy succeeding, a menu opening — already has its own
  visual state change that says the same thing on its own; the cue is a
  bonus channel for people who have chosen it, not a requirement for
  understanding what happened.
- **The sound preference is independent of `prefers-reduced-motion`.**
  Reduced motion is about vestibular/motion sensitivity; sound is a separate
  axis a person opts into on its own switch. `SoundToggle`'s own state
  transition (a small opacity/scale flip between its two glyphs) still
  respects `@media (prefers-reduced-motion: no-preference)` like every other
  animated control in this library — but turning system motion preferences
  down does not turn sound on, and turning sound on does not turn motion up.
- **Disabled controls stay silent.** Both the declarative `soundFeedback`
  action and every component's own `sound` prop check the same disabled
  state (`disabled`, `aria-disabled="true"`, `data-disabled="true"`, a
  surrounding `FormField`) before resolving a cue — a control a screen
  reader announces as unavailable never plays a confirmation sound either.

## The cue catalogue

Eleven semantic cues. A component or a `use:soundFeedback` binding names one
by intent — `press`, `select`, `open` — never a frequency or a duration; the
theme behind the name is free to change without any call site changing.

| Cue          | Use it for                                                                                                   | Avoid                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `hover`      | Dense pointer UI: menus, docks, toolbars.                                                                    | Lists and anything that scrolls — rate-limited and silent on touch. |
| `press`      | Buttons and primary actions.                                                                                 | Pairing with a toggle cue on the same control.                      |
| `toggle-on`  | A switch, checkbox, or pressed toggle turning on.                                                            | Navigation.                                                         |
| `toggle-off` | A switch, checkbox, or pressed toggle turning off.                                                           | Navigation.                                                         |
| `open`       | A menu, dialog, or popover opening.                                                                          | Tooltips and hover cards.                                           |
| `close`      | A menu, dialog, or popover closing.                                                                          | Tooltips and hover cards.                                           |
| `select`     | Committing a choice in a list or menu.                                                                       | Each arrow-key step while browsing options — that's `tick`.         |
| `success`    | The outcome of an async action that succeeded.                                                               | Per-keystroke validation.                                           |
| `error`      | The outcome of an async action that failed.                                                                  | Per-keystroke validation.                                           |
| `tick`       | Steppers, sliders, scroll-snap — the only cue meant to repeat quickly, and kept near-silent for that reason. | Anything that should read as a single, distinct event.              |
| `copy`       | A clipboard confirmation, once per copy.                                                                     | Firing more than once for one copy action.                          |

Play any of them directly:

```ts
import { sound } from "fancy-ui-svelte";

sound.play("select");
sound.play("error", { volume: 0.6 });
```

`SoundPlayOptions` lets a single call adjust `volume` (0–1 multiplier),
`pitch` (±24 semitones, oscillator layers only) and `playbackRate`
(0.25–4×) without touching the theme.

## `soundFeedback` — wiring cues to plain elements

For markup that doesn't have a `sound` prop of its own, bind cues directly:

```svelte
<script>
	import { soundFeedback } from "fancy-ui-svelte";
</script>

<!-- default: click → press -->
<button use:soundFeedback>Do the thing</button>

<!-- hover is opt-in; `on` replaces the defaults entirely -->
<button use:soundFeedback={{ on: { pointerenter: "hover", click: "press" } }}>Hover me</button>
<button use:soundFeedback={{ on: { click: "select" } }}>Choose</button>

<!-- a resolver computes the cue from the event -->
<input
	type="checkbox"
	use:soundFeedback={{
		on: { change: (e) => (e.currentTarget.checked ? "toggle-on" : "toggle-off") },
	}}
/>
```

- Listeners are bound `{ passive: true }` and the action never calls
  `preventDefault`/`stopPropagation` — it only ever listens.
- `disabled`, `aria-disabled="true"` and `data-disabled="true"` all silence
  every cue for that element, the same guard `sound`-prop components use.
- Hover is opt-in because a hover cue is a choice for dense pointer UI, not
  something every button should inherit — and because `<Button sound>` plays
  `press` only, so the two doors to "sound on a button" behave the same.
- Hover cues (`pointerenter`/`mouseenter`) additionally stay silent for
  untrusted events (unless `allowUntrusted` is set — useful in tests), for
  any pointer that is not a mouse or pen (a touch tap fires `pointerenter`
  and then `click`, and one tap must be one cue), for a compatibility
  `mouseenter` that came from a touch, when no pointer has moved in the last
  150 ms (content scrolling under a stationary pointer also fires
  `pointerenter` — that is not a hover), and when re-entering from a child
  element (`relatedTarget` inside the node).
- A `<label>` that wraps an `<input>` dispatches `click` twice (once on the
  label, once forwarded to the input). Put `use:soundFeedback` on the input,
  or map `change` instead of `click`, as the checkbox example above does.
- A resolver that throws is swallowed, same as every other Web Audio/storage
  failure in this family — it silences that one event rather than breaking
  the page.
- `update()` unbinds and rebinds from new options; `destroy()` unbinds
  everything. Nothing leaks a listener across either.

## The `sound` prop on components

Seven components carry an opt-in `sound?: boolean` prop (default `false`)
that plays the matching cue through the same controller, from inside each
component's own existing guarded handler — no new markup, no behaviour
change, no extra event:

| Component      | Cue(s)                                                                    |
| -------------- | ------------------------------------------------------------------------- |
| `Button`       | `press` on activation                                                     |
| `CopyButton`   | `copy` on a successful copy, `error` otherwise                            |
| `Checkbox`     | `toggle-on` / `toggle-off`                                                |
| `Switch`       | `toggle-on` / `toggle-off`                                                |
| `RadioGroup`   | `select` when the selection actually changes                              |
| `Select`       | `open` on opening, `select` on committing a value, `close` on a dismissal |
| `DropdownMenu` | `open`/`close` on the root and on submenus, `select` on an item           |

```svelte
<Button sound onclick={save}>Save changes</Button>
<Checkbox sound bind:checked={agreed}>I agree</Checkbox>
```

Each is off by default and silent until the person has separately turned
sound on — see each component's own README for its exact hook and any
double-fire guard specific to it (a label click dispatching two DOM events
for one real change, a commit that must not also fire `close`, and so on).
`CopyButton` is the one cue scheduled after an `await` (the clipboard
promise), so it relies on the context already running — which it is as soon
as sound was enabled from a click.

## Reading state: getters first, `subscribe` for everything else

`sound.enabled`, `sound.volume`, `sound.theme` and `sound.status` are getters
over rune state — read them in a template or a `$derived` and they update.
`sound.subscribe(run)` exists only for non-rune consumers (plain modules, a
store-based component): it calls `run` with a `SoundPreferences` snapshot
immediately and on every preference change. It is the same data in a second
shape; `sound.enabled` is the idiomatic path. One caveat: `$inspect(sound.enabled)`
throws in dev, because the first read hydrates state inside a derived and
Svelte's inspect guard does not honour `untrack` — read it into a `$derived`
first if you need to inspect it.

## SSR

Nothing in `sound/` touches a browser global at import time or at render
time on the server. `sound.enabled` reads `false` there, `sound.play()` is a
no-op, `sound.unlock()` resolves `false`, and `<SoundToggle>` server-renders
`role="switch" aria-checked="false"` — the same DOM shape hydration then
reconciles against once real preferences are read from storage, with no
flash between the two because both of `SoundToggle`'s glyphs are always
present and only ever switched by CSS.

## Testing

`resetSoundForTests()` (not exported from the package barrel) resets the
controller between tests: it disposes the engine, resets preferences and
status to their defaults, clears every subscriber, and removes the
`storage` listener. Because `sound` is a plain object literal, its methods
can be spied directly instead of driving a real `AudioContext`:

```ts
import { sound, resetSoundForTests } from "./sound.svelte.js";

beforeEach(() => {
	resetSoundForTests();
	localStorage.clear();
});

it("plays press once on click", () => {
	const play = vi.spyOn(sound, "play").mockImplementation(() => {});
	// fireEvent.click(button);
	expect(play).toHaveBeenCalledWith("press");
	expect(play).toHaveBeenCalledTimes(1);
});
```

For tests that need the engine itself to actually build a Web Audio graph
against a fake context, see `src/lib/fancy-ui/sound/web-audio-mock.ts` — a
dependency-free fake of the Web Audio surface `createSoundEngine()` uses,
injectable through its `getContext` option.
