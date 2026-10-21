# Avatar

A person or account as a picture that behaves while it is not there yet: a
skeleton holds the place until the image loads, and if it never does, one or two
initials stand in on a colour that is always the same for the same name.

## Usage

```svelte
<script>
	import { Avatar } from "fancy-ui-svelte";
</script>

<!-- An image, named for screen readers -->
<Avatar src="/maya.jpg" alt="Maya Okafor" name="Maya Okafor" />

<!-- No image: initials "MO" on a colour chosen from the name -->
<Avatar name="Maya Okafor" />

<!-- Beside a visible name, say nothing twice -->
<Avatar name="Maya Okafor" alt="" />
<span>Maya Okafor</span>

<Avatar name="Maya Okafor" size="lg" shape="square" />
```

## Props

| Prop    | Type                   | Default    | Description                                                                                                                |
| ------- | ---------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| `src`   | `string`               | —          | Image URL. While it loads a skeleton shows; if it fails the initials show                                                  |
| `alt`   | `string`               | —          | The accessible name. Required decision when `src` is set: describe the image, or `""` for decorative. Falls back to `name` |
| `name`  | `string`               | —          | Who this is. Gives one or two initials and a colour that is always the same for the same name                              |
| `size`  | `"sm" \| "md" \| "lg"` | `"md"`     | 28, 36 or 64px                                                                                                             |
| `shape` | `"circle" \| "square"` | `"circle"` | Fully round, or a rounded square                                                                                           |
| `class` | `string`               | —          | Merged over the base classes                                                                                               |

Every other attribute and listener of a `<span>` is passed to the root.
`data-size`, `data-shape` and `data-status` are the component's own.

## States

`data-status` on the root says where the avatar is:

| Status     | What shows                                                                    |
| ---------- | ----------------------------------------------------------------------------- |
| `loading`  | A pulsing skeleton, with the image already requested and invisible            |
| `loaded`   | The image, faded in                                                           |
| `fallback` | The initials, or a silhouette when the name has no letter or there is no name |

A `src` that changes starts over at `loading`. An image that finished before the
page hydrated is picked up once the component mounts, so the skeleton never gets
stuck on a cached picture.

## Initials and colour

- The initials are the first letter of the first and of the last word of `name`,
  upper-cased: "Maya Okafor" is `MO`, "Cher" is `C`, "Jean Luc Picard" is `JP`.
  Leading punctuation is skipped and non-latin letters are kept whole.
- The colour comes from a small hash of the name (case and spacing do not
  matter) into eight soft tints, so the same name is the same colour on the
  server, in the browser and across the three packages. A name with nothing to
  take initials from gets the neutral `muted` look and a silhouette.

## Accessibility

- **Named.** With an accessible name (`alt`, else `name`) the root is
  `role="img"` with that `aria-label`. The inner `<img>` has `alt=""` so the name
  is said once, and stays correct while the picture is loading or has failed.
- **Decorative.** `alt=""` (or nothing to name it by) makes the root
  `aria-hidden`. Use it beside a visible name, in a list row or a message header.
- The initials, the silhouette and the skeleton are always `aria-hidden`.
- The component owns `aria-hidden` always, and `role` and `aria-label` while it
  has a name; a `role` or `aria-label` you pass only lands on a decorative
  avatar.

## Motion

The skeleton pulses under `motion-safe:` only, so with reduced motion it is a
still tint. The image fades in under the same gate and otherwise appears at once.
