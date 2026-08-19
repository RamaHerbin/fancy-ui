---
"fancy-ui-svelte": minor
---

The Core navigation family: `Navbar`, `Sidebar`, `Tabs`, `Breadcrumb`, `Pagination`,
`Stepper`, `DropdownMenu`, `ContextMenu`, `CommandMenu` and `NavigationMenu`, plus
`_internals/menu`.

`NavigationMenu` is deliberately not a menu. `role="menu"` describes an application menu of
commands, and marking site navigation that way makes assistive technology announce a
command menu that behaves nothing like one — so it implements the disclosure-navigation
pattern instead: a `<nav>` of buttons carrying `aria-expanded` and `aria-controls`. The
menus that genuinely are menus — `DropdownMenu` and `ContextMenu` — share one
implementation of their items, keyboard handling and submenus rather than carrying two
copies that drift, and move real DOM focus rather than pointing at rows with
`aria-activedescendant`, because that is what `role="menu"` promises a screen reader.

`_internals/menu` gets three behaviours right once for every menu surface: items navigate
in document order rather than the order they happened to register, which diverge whenever a
conditional block or a reordering list is involved; a run of disabled items is skipped as a
block, terminating rather than spinning when every item is disabled; and typeahead matches
an item's _visible_ text, excluding `aria-hidden` icons and shortcut hints, so pressing "r"
finds a row labelled "Rename" that renders a decorative glyph before it.

`CommandMenu` keeps focus in its input and highlights the matched substring by splitting the
label into rendered segments — never `{@html}` — locating the match in the original label
rather than the accent-folded one, since stripping combining marks shifts every index after
them.

`Breadcrumb` will not collapse the current page: `itemsAfterCollapse` has a floor of 1,
because a breadcrumb whose last item is hidden is a navigation landmark that no longer says
where you are. `Pagination` derives its page window from a pure, separately tested function
and floors its inputs, so a `count` computed by division rather than `Math.ceil` cannot
silently drop pages.

Every component here dresses in the theme's semantic tokens, so light mode, the theme
generator and the skins all keep working; the brand accent sits behind `--ft-nav-accent`,
declared with its fallback on each element that reads it — including every portalled panel,
which inherits nothing from the component it belongs to.
