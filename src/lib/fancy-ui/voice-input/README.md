# Voice Input

A mic button that opens into a recording panel: a live waveform, a stopwatch, the transcript as it arrives, and a cross and a check to throw it away or keep it.

## Components

- `VoiceInput` — the mic button and the panel it becomes

## Usage

```svelte
<script>
	import { VoiceInput } from "fancy-ui-svelte";

	let active = $state(false);
	let transcript = $state("");
</script>

<VoiceInput bind:active {transcript} onStart={startRecogniser} onStop={submit} onCancel={discard} />
```

## This component never opens a microphone

It draws a recording; it does not make one. There is no `getUserMedia` call, no `AudioContext`, no `MediaRecorder`, and no speech-recognition API anywhere in it — so it adds no permission prompt, no autoplay-policy surprise, and nothing that has to be torn down on a route change.

That leaves you owning the pipeline, which is the only way this works across the many that exist. You feed it two things:

- **`samples`** — amplitude levels in `0..1`, one entry per bar you want drawn, refreshed as often as you like. From a Web Audio `AnalyserNode` that is `getByteFrequencyData` into a `Uint8Array`, divided by 255.
- **`transcript`** — whatever text your recogniser has produced so far.

Neither has to arrive on any particular schedule. The waveform redraws every frame from whatever `samples` currently holds, and the transcript is plain reactive text.

```svelte
<script>
	let active = $state(false);
	let samples = $state(new Float32Array(0));
	let transcript = $state("");

	async function startRecogniser() {
		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		const ctx = new AudioContext();
		const analyser = ctx.createAnalyser();
		analyser.fftSize = 128;
		ctx.createMediaStreamSource(stream).connect(analyser);

		const bytes = new Uint8Array(analyser.frequencyBinCount);
		const next = new Float32Array(analyser.frequencyBinCount);
		(function poll() {
			if (!active) return;
			analyser.getByteFrequencyData(bytes);
			for (let i = 0; i < bytes.length; i++) next[i] = bytes[i] / 255;
			samples = next.slice();
			requestAnimationFrame(poll);
		})();
	}
</script>

<VoiceInput bind:active {samples} {transcript} onStart={startRecogniser} />
```

With no `samples` and no `demo`, the waveform draws a flat floor: a live signal with nothing in it, rather than an empty box.

## Demo mode

`demo` swaps in a deterministic synthetic wave so the component is legible on a docs page, in a story, or in a design review with no audio behind it. It is a stand-in and nothing more: **the moment real `samples` arrive they win**, so leaving `demo` on in production degrades to a plausible waveform instead of a dead one, and never overwrites a real signal.

## Props

| Prop         | Type                     | Default                               | Description                                           |
| ------------ | ------------------------ | ------------------------------------- | ----------------------------------------------------- |
| `active`     | `boolean`                | `false`                               | Whether a recording is in progress. Bindable          |
| `transcript` | `string`                 | `""`                                  | Live text; rendered muted under the waveform          |
| `samples`    | `ArrayLike<number>`      | `undefined`                           | Amplitude levels in `0..1`, from your own pipeline    |
| `demo`       | `boolean`                | `false`                               | Draw a synthetic wave when no samples arrive          |
| `onStart`    | `() => void`             | `undefined`                           | The mic button started a recording                    |
| `onStop`     | `() => void`             | `undefined`                           | The check ended it and kept the transcript            |
| `onCancel`   | `() => void`             | `undefined`                           | The cross abandoned it                                |
| `height`     | `number`                 | `48`                                  | Waveform height in CSS pixels, clamped to `16..240`   |
| `color`      | `string`                 | `var(--ft-voice-color, currentColor)` | Any CSS colour for the bars                           |
| `class`      | `string`                 | `undefined`                           | Additional CSS classes                                |
| `ref`        | `HTMLDivElement \| null` | `null`                                | Bindable reference to the root element                |
| `sound`      | `boolean`                | `false`                               | Plays `open`/`close`/`select` on start/cancel/confirm |

## Sound

Set `sound` to opt into interface cues, off by default and silent until the user has enabled sound in their own preferences (see [`sound/README.md`](../sound/README.md)):

```svelte
<VoiceInput bind:active sound />
```

The mic button plays `open` when it starts a recording; the cross plays `close`, abandoning it; the check plays `select`, not `close` — it commits the transcript, the same shape as every other commit branch in the library. This component never opens a microphone or runs a recogniser itself (see above), so it has no outcome of its own to report: `success`/`error` are the consumer's to play, from their own recogniser's real resolution, once they know which. Every cue plays synchronously inside its own click, before `active` flips and before the matching callback fires. Setting `active` from outside plays nothing — the cues describe what a button did, not what the state now is, exactly like `onStart`/`onStop`/`onCancel` above.

## The active contract

`active` is the whole state machine. It starts `false` — the mic button alone — and each button writes through it:

| Button | Writes           | Calls      |
| ------ | ---------------- | ---------- |
| mic    | `active = true`  | `onStart`  |
| cross  | `active = false` | `onCancel` |
| check  | `active = false` | `onStop`   |

Set it from outside and the panel opens or closes to match, **without** firing any callback — the callbacks report what the user did, not what the state is. So a consumer that starts a recording from a keyboard shortcut sets `active = true` and calls their own recogniser directly; they will not get an `onStart` for it.

Neither the transcript nor the samples are cleared on cancel. The component does not own that text — you pushed it in, and you decide whether the next recording starts from empty. `onCancel` is where you do it.

## Accessibility

- The root is a `role="group"` named _"Voice input"_, so the mic and the panel it becomes read as one control rather than as unrelated buttons appearing and disappearing.
- The three buttons carry the labels _"Start voice input"_, _"Cancel voice input"_ and _"Stop voice input"_ — the icons say nothing out loud.
- Recording is announced through an `sr-only` `role="status"` line that is **always in the document** and changes its text between `""` and `"Recording"`. A live region inserted along with its own content is announced unreliably; one that outlives the change is not.
- **Focus follows the swap.** Each button destroys itself when it flips `active`, so pressing one hands focus straight on to the control that replaces it: the mic opens the panel and focuses _"Cancel voice input"_, and the cross and the check close it and focus the mic again. Without that, focus would fall to `<body>` on every start, cancel and confirm, and the next Tab would restart from the top of the page. Setting `active` from outside moves nothing — focus stays wherever you put it, the same way no callback fires.
- The canvas is `aria-hidden`. It is a picture of an amplitude the stopwatch and the transcript already state in words.
- The transcript is deliberately **not** a live region. Partial recogniser output announced word by word is unusable; wrap the component and mirror the text into your own region if your application wants it announced.

## Styling

| Variable                           | Default               | Applies to                      |
| ---------------------------------- | --------------------- | ------------------------------- |
| `--ft-voice-color`                 | `currentColor`        | Waveform bars                   |
| `--ft-voice-dot`                   | `--ft-status-running` | The recording dot and its pulse |
| `--ft-voice-pulse-duration`        | `1.6s`                | Speed of the dot's pulse        |
| `--ft-voice-transcript-max-height` | `4.5rem`              | Scroll cap on a long transcript |

The dot takes `--ft-status-running`, the run-in-flight colour shared with `ToolCall`, `ToolTimeline` and the rest of the family, because a recording _is_ a run in flight — retinting the family's error colour should not turn the record light red. Its default is the same `light-dark()` pair those components use:

```css
light-dark(oklch(0.5 0.18 265), oklch(0.72 0.15 265));
```

Which half applies is decided by `color-scheme`, so your theme must declare it:

```css
:root {
	color-scheme: light;
}
.dark {
	color-scheme: dark;
}
```

If you want the classic red record dot, that is one line and it does not disturb anything else:

```css
.my-composer {
	--ft-voice-dot: oklch(0.6 0.2 25);
}
```

`color` is a prop rather than only a variable because it reaches the canvas, which is not styled by CSS. Whatever you pass — a hex, an `oklch()`, a `var()` — is written onto the canvas element as its CSS `color` and read back resolved before painting, so `var()` and `currentColor` work there exactly as they do everywhere else.

## Implementation Notes

- One `$effect` owns the entire canvas lifetime. It re-runs when the panel opens or closes and when `height` or `color` changes — all rare. Everything that changes per frame, `samples` and `demo` included, is read from inside the `requestAnimationFrame` callback, which is outside any tracking context: a consumer pushing sixty buffers a second does not tear the loop down and rebuild it sixty times a second.
- The drawing itself is `drawWaveformFrame` from the shared waveform core, which is pure and unit-tested against a stub context. The component contributes the canvas, the DPR transform, and the loop.
- Backing-store size is `devicePixelRatio`-scaled and a `setTransform` is re-applied after every resize — assigning `width` or `height` resets the context — so all the geometry above stays in CSS pixels.
- A `getContext("2d")` that returns `null` (jsdom, a surface the browser refuses to back) is a return, not a throw. The panel keeps its dot, timer, transcript and buttons; only the bars are missing.
- **Reduced motion paints one still frame and starts no loop at all.** A sixty-per-second amplitude meter is exactly the motion the setting asks us not to run, and the recording is still announced, still timed and still transcribed without it. The frame is painted inside `untrack`, so incoming samples cannot restart the effect and turn the still back into an animation. The dot's pulse is the only other animation and it lives behind `prefers-reduced-motion: no-preference`.
- The stopwatch is `createElapsed` from the shared elapsed module. `start()` hands back its own stop function, which doubles as the effect cleanup, so the timer exists only while `active` is true and each recording is timed from its own zero.
- Nothing is scheduled and no DOM is touched at construction time, so the mic button renders under SSR unchanged.
