# Book

A 3D book component with cover, spine, and back face. Opens on hover with a smooth rotation animation.

Native attributes and listeners (`id`, `aria-*`, `data-*`, `onclick`...) go to each part's own element: the 3D wrapper `<div>` for `Book`, the `<div>` of `BookHeader`, the `<h1>` of `BookTitle` and the `<p>` of `BookDescription`. `class` keeps its current target.

## Components

- `Book` — Main container with 3D perspective
- `BookHeader` — Flex container for tags/badges
- `BookTitle` — Bold heading for the book title
- `BookDescription` — Small text for description

## Props (Book)

| Prop         | Type           | Default  | Description                    |
| ------------ | -------------- | -------- | ------------------------------ |
| `color`      | `BookColor`    | `"zinc"` | Gradient color (22 options)    |
| `size`       | `BookSize`     | `"md"`   | Width (sm/md/lg/xl)            |
| `radius`     | `BookRadius`   | `"md"`   | Border radius                  |
| `shadowSize` | `BookShadowSize` | `"lg"` | Back shadow size               |
| `duration`   | `number`       | `1000`   | Transition duration in ms      |
| `isStatic`   | `boolean`      | `false`  | Always show opened state       |
| `class`      | `string`       | `""`     | Additional CSS classes         |

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

## Reduced motion

With `prefers-reduced-motion: reduce` the cover still opens on hover (or sits open when `isStatic` is set) but lands on its angle at once instead of turning over `duration`. The state is unchanged, only the tween is dropped.

## Accessibility

- The cover opens on hover and on keyboard focus: `:focus-visible` on the book itself, or on a link or button inside it, turns the cover the same way.
- Unless `isStatic` is set, the `Book` root is a tab stop so the cover can be reached without a pointer. If the book wraps its own link or button and you do not want the extra stop, pass `tabindex="-1"` (attributes are spread after the built-in one, so yours wins); focus on the inner control still opens the cover.
