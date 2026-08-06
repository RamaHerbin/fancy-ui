# TracingBeam

Vertical SVG beam that highlights scroll progress alongside content.

## Props

| Prop    | Type     | Default | Description            |
| ------- | -------- | ------- | ---------------------- |
| `class` | `string` | `''`    | Additional CSS classes |

## Usage

Wrap your content inside TracingBeam:

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
