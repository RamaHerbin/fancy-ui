# TracingBeam

A reading lamp on a rail beside long-form content. The lamp sits on the reader's
line of sight (a fraction of the viewport, `readingLine`) and follows the scroll
on a spring, so it trails the eye rather than jumping with it. Everything above
the lamp — what has been read — stays softly lit; the rail below is a bare
hairline. A marker on the rail stands for every heading inside the content and
lights up as the lamp passes it.

The rail lives in its own gutter column (`--tracing-beam-gutter`, 2.5rem by
default), so nothing hangs outside the wrapper and nothing gets clipped.

## Props

| Prop          | Type      | Default             | Description                                                                                                        |
| ------------- | --------- | ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `accent`      | `string`  | follows `--primary` | Colour of the lamp, its trail and the lit markers. Any CSS colour; also settable via `--tracing-beam-accent`.      |
| `readingLine` | `number`  | `0.38`              | Where the reader's eye is assumed to be, as a fraction of the viewport height. The lamp is clamped to the content. |
| `markers`     | `boolean` | `true`              | One marker per heading (`h1`–`h4`) in the content, or per direct child when there is none.                         |
| `class`       | `string`  | `''`                | Additional CSS classes for the outer wrapper                                                                       |

## Usage

Wrap your content inside TracingBeam. Headings become the markers:

```svelte
<TracingBeam>
	<article>
		<h2>Section 1</h2>
		<p>Content here...</p>
		<h2>Section 2</h2>
		<p>More content...</p>
	</article>
</TracingBeam>
```

## Motion

The lamp's position is written as `--tb-progress` on the wrapper; the trail,
the lamp and the markers are CSS driven from it. Under `prefers-reduced-motion`
the lamp still tracks the reading line, but without the spring, without the
marker transitions and without the light spilling onto the text.

## CSS hooks

- `--tracing-beam-accent` — the colour, same as the `accent` prop.
- `--tracing-beam-gutter` — width of the rail column (default `2.5rem`).
- `[data-tracing-beam-marker][data-lit="true"]` — a marker the lamp has passed.
