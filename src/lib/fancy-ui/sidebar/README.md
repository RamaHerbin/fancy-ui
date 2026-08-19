# Sidebar

A collapsible, grouped navigation rail: labelled sections of items, an
accent-marked current item, badges folded into each item's accessible name,
and an icon-only collapsed state that never drops a label from the
accessibility tree.

## Components

- `Sidebar` — the `<nav>` root: owns the collapsed/expanded state and
  publishes it through context
- `SidebarGroup` — a labelled section: a heading plus a `<ul>` of items,
  wired together with `aria-labelledby`
- `SidebarItem` — one row: an `<a>` when given `href`, a `<button
type="button">` otherwise
- `SidebarSeparator` — a hairline divider
- `SidebarFooter` — the bottom row: a separator, then an avatar and text

## Usage

```svelte
<script>
	import { Sidebar, SidebarGroup, SidebarItem, SidebarFooter } from "fancy-ui-svelte";

	let collapsed = $state(false);
</script>

<Sidebar {collapsed}>
	<SidebarGroup label="General">
		<SidebarItem href="/dashboard" current>Dashboard</SidebarItem>
		<SidebarItem href="/projects">Projects</SidebarItem>
		<SidebarItem href="/inbox" badge={4} badgeLabel="unread">Inbox</SidebarItem>
		<SidebarItem href="/settings">Settings</SidebarItem>
	</SidebarGroup>

	<SidebarFooter>
		{#snippet avatar()}
			<span class="h-[22px] w-[22px] rounded-full bg-gradient-to-br from-purple-500 to-cyan-400"
			></span>
		{/snippet}
		Rama H.
	</SidebarFooter>
</Sidebar>

<button type="button" onclick={() => (collapsed = !collapsed)}>Toggle</button>
```

`collapsed` is a plain prop, not bindable — `Sidebar` has no built-in trigger
of its own that ever changes it, so there is nothing inside the compound for
a binding to round-trip. Own the state yourself, the way the example above
does, and pass it straight through. Every item under it that has an `icon`
snippet keeps its glyph visible while collapsed and moves its label to
`sr-only` text, so a screen reader user never loses the item's name just
because the rail visually shrank — see "Icons and the collapsed state"
below for what happens to an item that has no icon.

## Props

### Sidebar

| Prop        | Type                  | Default     | Description                                                                |
| ----------- | --------------------- | ----------- | -------------------------------------------------------------------------- |
| `label`     | `string`              | `"Sidebar"` | Accessible name for the `<nav>` landmark                                   |
| `collapsed` | `boolean`             | `false`     | Whether the sidebar is collapsed to an icon-only rail. Plain, not bindable |
| `children`  | `Snippet`             | —           | `SidebarGroup`, `SidebarSeparator` and `SidebarFooter`                     |
| `class`     | `string`              | —           | Additional CSS classes                                                     |
| `ref`       | `HTMLElement \| null` | `null`      | Bindable element reference                                                 |

### SidebarGroup

| Prop       | Type      | Default | Description                                     |
| ---------- | --------- | ------- | ----------------------------------------------- |
| `label`    | `string`  | —       | The section heading, e.g. `"General"`. Required |
| `children` | `Snippet` | —       | The `SidebarItem`s in this section              |
| `class`    | `string`  | —       | Additional CSS classes                          |

### SidebarItem

| Prop         | Type                                             | Default | Description                                                                             |
| ------------ | ------------------------------------------------ | ------- | --------------------------------------------------------------------------------------- |
| `href`       | `string`                                         | —       | Renders an `<a>` when set; a `<button type="button">` otherwise                         |
| `current`    | `boolean`                                        | `false` | Marks this as the current item — `aria-current="page"` plus the accent left bar         |
| `badge`      | `string \| number`                               | —       | A count or short flag, e.g. `4`, rendered as a pill                                     |
| `badgeLabel` | `string`                                         | —       | What the badge means, folded into the accessible name. Defaults to just the badge value |
| `disabled`   | `boolean`                                        | `false` | Disables both the click and keyboard-activation paths                                   |
| `onclick`    | `(event: MouseEvent) => void`                    | —       | Native click handler, for the `<button>` branch. Never called while `disabled`          |
| `icon`       | `Snippet`                                        | —       | A decorative glyph or icon, shown even while the sidebar is collapsed                   |
| `children`   | `Snippet`                                        | —       | The item's label. Moves to `sr-only` text while collapsed — never removed               |
| `class`      | `string`                                         | —       | Additional CSS classes                                                                  |
| `ref`        | `HTMLAnchorElement \| HTMLButtonElement \| null` | `null`  | Bindable element reference                                                              |

### SidebarSeparator

| Prop    | Type                    | Default | Description                |
| ------- | ----------------------- | ------- | -------------------------- |
| `class` | `string`                | —       | Additional CSS classes     |
| `ref`   | `HTMLHRElement \| null` | `null`  | Bindable element reference |

### SidebarFooter

| Prop       | Type                     | Default | Description                                                    |
| ---------- | ------------------------ | ------- | -------------------------------------------------------------- |
| `avatar`   | `Snippet`                | —       | A decorative avatar, shown even while the sidebar is collapsed |
| `children` | `Snippet`                | —       | The name / text next to the avatar. `sr-only` while collapsed  |
| `class`    | `string`                 | —       | Additional CSS classes                                         |
| `ref`      | `HTMLDivElement \| null` | `null`  | Bindable element reference                                     |

## Accessibility

- `Sidebar` renders a `<nav>` with an accessible name (`label`, default
  `"Sidebar"`).
- `SidebarGroup`'s heading is real, not a styled `<span>` floating free: it
  carries an `id`, and the group's `<ul>` points `aria-labelledby` at it.
  While collapsed, the heading text moves to `sr-only` — it still exists.
- `SidebarItem`'s `current` sets `aria-current="page"` **and** a visible
  background, font-weight and accent left bar — never colour alone.
- A badge is folded into the item's accessible name rather than announced as
  an orphan number: `<SidebarItem badge={4} badgeLabel="unread">Inbox</SidebarItem>`
  reads as "Inbox 4 unread", not just "Inbox" with a silent "4" next to it.
- **Collapsed is icon-only, never information-only-in-pixels.** The item's
  label and the badge's value/meaning both move to `sr-only` text rather
  than disappearing — a screen reader user gets the exact same information
  whether the rail is expanded or collapsed.
- `disabled` on an `<a>`-rendered item strips `href`, sets
  `aria-disabled="true"` and `tabindex="-1"`; on a `<button>`-rendered item
  the native `disabled` attribute does the same job. Either way the click
  handler itself also refuses to fire — a synthetic `.click()` bypasses a
  missing native `disabled` attribute on an anchor, and even the button
  branch is guarded the same way for consistency.

## Icons and the collapsed state

**Give every `SidebarItem` that might ever render collapsed an `icon`.** A
collapsed item's label and badge move to `sr-only` text — correct and
complete for a screen reader — but nothing replaces them visually. An item
with no `icon` therefore renders as a blank, empty-looking row: fully
accessible, but nothing for a sighted user to see, aim at, or recognise.

This is a stated constraint rather than an invented fallback on purpose. An
auto-generated glyph — the label's first letter, say — was considered and
rejected: two items that start with the same letter (`"Settings"` and
`"Security"`, `"Projects"` and `"Profile"`) would render identically once
collapsed, which is actively misleading in a way a visibly blank row is not.
A blank row is at least honestly blank; a wrong-looking initial invites a
sighted user to trust something false. If your item set can't guarantee a
distinct, meaningful icon for every entry, don't collapse this sidebar, or
override the collapsed row's own styling to show something else through
`class`.

## Theming

`Sidebar` and `SidebarItem` **both** declare `--ft-nav-accent`, each with
the same documented fallback, and neither ever redeclares `--ft-accent`
itself:

```css
--ft-nav-accent: var(
	--ft-accent,
	light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
);
```

`SidebarItem` reads `var(--ft-nav-accent)` for the current item's accent
left bar and for the badge's fill. It declares its own copy of the fallback
rather than relying on inheriting `Sidebar`'s — the same shape `Button`'s
`--ft-btn-accent` and `Autocomplete`/`Combobox`/`TimePicker`'s
`--ft-field-accent` already use, and specifically the same reason
`TimePicker`'s portalled `TimePickerPanel` declares its own copy too: a
component meant to be usable on its own, not only as a literal DOM
descendant of one particular ancestor, can't lean on inheritance alone.
Retint every accent from higher up the tree — this reaches both
declarations, since neither one redeclares `--ft-accent` itself:

```css
.my-shell {
	--ft-accent: oklch(0.7 0.18 200);
}
```

The badge's text colour reads a second, separate custom property,
`--ft-accent-foreground`, with a plain white fallback:

```css
color: var(--ft-accent-foreground, oklch(1 0 0));
```

This is the same shared convention `Button`, `Toggle` and `IconButton`
already read for text drawn on top of the brand accent — set it alongside
`--ft-accent` if your retint needs a different foreground than white to stay
readable:

```css
.my-shell {
	--ft-accent: oklch(0.7 0.18 200);
	--ft-accent-foreground: oklch(0.15 0 0);
}
```

## Implementation Notes

- The context (`types.ts`) is deliberately read-only: it exposes only
  `collapsed`, with no `toggle`/`setCollapsed` method. Nothing inside the
  compound ever changes `collapsed` itself — it's driven entirely from
  outside, by whatever trigger a consumer builds — which is also why
  `collapsed` is a plain prop rather than `$bindable`: a binding exists to
  let a child hand a value back up to its parent, and `Sidebar` never has
  one of its own to hand back.
- `SidebarItem` renders inside an `<li>` — `SidebarGroup`'s `<ul>` expects
  list-item children, and this is what keeps the markup valid without every
  consumer having to remember to wrap each item themselves.
- `SidebarFooter` renders a real `SidebarSeparator`, not a duplicated inline
  hairline — the same component a consumer would use directly between
  groups.
- A badge's visible pill and its `badgeLabel` note both move to `sr-only`
  together with the item's label while collapsed, rather than trying to
  keep the pill visible in an icon-only row where there's no room for it.
- Sizing (`240px` expanded, `64px` collapsed) is a deliberate default, not
  read off the mockup, which doesn't constrain the sidebar's own width —
  override with `class` if your layout needs different numbers.
