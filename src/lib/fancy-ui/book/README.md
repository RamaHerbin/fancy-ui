# Book

A 3D book component with cover, spine, and back face. Opens on hover with a smooth rotation animation.

## Components

- `Book` — Main container with 3D perspective
- `BookHeader` — Flex container for tags/badges
- `BookTitle` — Bold heading for the book title
- `BookDescription` — Small text for description

## Props (Book)

| Prop         | Type             | Default  | Description                 |
| ------------ | ---------------- | -------- | --------------------------- |
| `color`      | `BookColor`      | `"zinc"` | Gradient color (22 options) |
| `size`       | `BookSize`       | `"md"`   | Width (sm/md/lg/xl)         |
| `radius`     | `BookRadius`     | `"md"`   | Border radius               |
| `shadowSize` | `BookShadowSize` | `"lg"`   | Back shadow size            |
| `duration`   | `number`         | `1000`   | Transition duration in ms   |
| `isStatic`   | `boolean`        | `false`  | Always show opened state    |
| `class`      | `string`         | `""`     | Additional CSS classes      |

## Usage

```svelte
<Book color="blue" size="md">
	<BookHeader>
		<span class="rounded bg-white/20 px-2 py-0.5 text-xs">New</span>
	</BookHeader>
	<BookTitle>My Book Title</BookTitle>
	<BookDescription>A short description of the book.</BookDescription>
</Book>
```
