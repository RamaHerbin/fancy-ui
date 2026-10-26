# Badge

A short pill of status text: a count, a state, a role. Five treatments and two
sizes, built from the library's theme tokens so it follows light and dark with
no extra work.

## Usage

```svelte
<script>
	import { Badge } from "fancy-ui-svelte";
</script>

<Badge>New</Badge>
<Badge variant="secondary">Draft</Badge>
<Badge variant="outline">v0.16</Badge>
<Badge variant="destructive">Failed</Badge>
<Badge variant="success" size="sm">Paid</Badge>
```

## Props

| Prop       | Type                                                                  | Default     | Description                                                                       |
| ---------- | --------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------- |
| `variant`  | `"default" \| "secondary" \| "outline" \| "destructive" \| "success"` | `"default"` | Visual treatment. Always pair it with a visible word: colour is never the message |
| `size`     | `"sm" \| "md"`                                                        | `"md"`      | Compact or regular                                                                |
| `children` | `Snippet`                                                             | —           | The label                                                                         |
| `class`    | `string`                                                              | —           | Merged over the base classes                                                      |

Every other attribute and listener of a `<span>` (`id`, `title`, `aria-*`,
`data-*`, `onclick`, ...) is passed to the root. `data-variant` and
`data-size` are the component's own and win over a value you pass.

## Accessibility

- A plain `<span>`: no role, no focus stop. A badge is static text, so its
  meaning must be in the words; colour only reinforces it.
- Every variant, including the soft destructive pair, keeps its text at 4.5:1
  or better against its own tint in both themes.
- When a badge is the only carrier of a status (an icon-only dot, a count), give
  the surrounding control an accessible name that says it; a native `aria-label`
  on the badge itself lands on the `<span>` as-is.

## Notes

- **A badge is text, not a widget.** It carries no role and no live region. When a
  count changes and someone must hear about it, announce it from the place that
  owns the change, not from the badge.
- **Colour is never the only signal.** `destructive` and `success` are tints; the
  word inside ("Failed", "Paid") carries the meaning.
- **One height.** Every variant has a border (transparent where it has no outline),
  so a row of mixed badges lines up.
- **Colour tokens.** `default`, `secondary`, `outline` and `destructive` use the
  `primary`, `secondary`, `border` and `destructive` tokens from the package's
  Tailwind entry. `success` uses the stock `emerald` scale, so it needs no token.
