# Dock

An icon dock component whose items magnify smoothly as the cursor approaches.

## Components

- `Dock` - Main container that tracks mouse position
- `DockIcon` - Individual dock item with magnification effect
- `DockSeparator` - Visual separator between icon groups

## Usage

```svelte
<script>
	import { Dock, DockIcon, DockSeparator } from "$lib/fancy-ui/dock";
</script>

<Dock>
	<DockIcon>
		<img src="/icon1.svg" class="size-full" alt="Icon" />
	</DockIcon>
	<DockSeparator />
	<DockIcon>
		<img src="/icon2.svg" class="size-full" alt="Icon" />
	</DockIcon>
</Dock>
```

## Props

### Dock

| Prop            | Type                            | Default        | Description                             |
| --------------- | ------------------------------- | -------------- | --------------------------------------- |
| `class`         | `string`                        | `''`           | Additional CSS classes                  |
| `magnification` | `number`                        | `60`           | Maximum size increase in pixels         |
| `distance`      | `number`                        | `140`          | Mouse distance for magnification effect |
| `direction`     | `'top' \| 'middle' \| 'bottom'` | `'middle'`     | Vertical alignment of icons             |
| `orientation`   | `'horizontal' \| 'vertical'`    | `'horizontal'` | Dock orientation                        |

### DockIcon

| Prop    | Type     | Default | Description            |
| ------- | -------- | ------- | ---------------------- |
| `class` | `string` | `''`    | Additional CSS classes |

### DockSeparator

| Prop    | Type     | Default | Description            |
| ------- | -------- | ------- | ---------------------- |
| `class` | `string` | `''`    | Additional CSS classes |

## Implementation Notes

- Uses Svelte context (`setContext`/`getContext`) instead of Vue's provide/inject
- Mouse position stored in reactive objects (`{ current: number }`) for child reactivity
- Base icon size is 40px, magnification adds to this
