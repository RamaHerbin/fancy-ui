# EditorialEngine

Live magazine layout powered by [@chenglou/pretext](https://github.com/chenglou/pretext):
multi-column text flow with cursor handoff, auto-fitted headline, drop cap,
pullquotes, and body text reflowing in real time around draggable animated
orbs. The render loop performs **zero DOM reads** — every line position is
computed arithmetically from cached font metrics, and the only DOM operations
are writes (`left`, `top`, `textContent`).

Inspired by the pretext
[editorial engine demo](https://chenglou.me/pretext/editorial-engine/).

## How it works

- `prepareWithSegments(body, font)` measures the text once against the canvas
  font engine.
- Each frame, every text line's vertical band is intersected with each orb;
  blocked horizontal intervals are subtracted from the column width and
  `layoutNextLine` fills every remaining slot — text flows on **both sides**
  of an obstacle, which CSS `shape-outside` cannot do.
- Columns hand a `LayoutCursor` to one another, so text continues
  mid-sentence across column boundaries like print.
- The headline binary-searches the largest font size that breaks no word
  (`walkLineRanges` to detect intra-word breaks).

## Usage

```svelte
<script lang="ts">
	import { EditorialEngine } from "$lib/fancy-ui/editorial-engine";
</script>

<div class="h-[85vh]">
	<EditorialEngine />
</div>
```

The stage fills its parent — give the parent an explicit height.

## Props

| Prop         | Type       | Default              | Description                                       |
| ------------ | ---------- | -------------------- | ------------------------------------------------- |
| `headline`   | `string`   | built-in copy        | Auto-sized headline (largest size, no word break) |
| `body`       | `string`   | built-in copy        | Body text, paragraphs separated by blank lines    |
| `pullquotes` | `string[]` | built-in quotes      | Up to two pullquotes embedded in the columns      |
| `fontFamily` | `string`   | Palatino serif stack | Font stack for all text                           |
| `class`      | `string`   | —                    | Additional CSS classes for the stage              |

## Interactions

- **Drag** an orb — text reparts around it every frame.
- **Click** an orb — pauses/resumes its drift.
- **Resize** — headline re-fits, column count adapts (1/2/3), text reflows.
- Text stays selectable; rendering pauses while a selection is active.
- `prefers-reduced-motion` starts all orbs paused (still draggable).
