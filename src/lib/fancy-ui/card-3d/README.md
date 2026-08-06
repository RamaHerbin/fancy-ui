# Card 3D

Interactive 3D perspective card that tilts based on mouse position, with child elements that can float at different depth levels.

## Components

- **CardContainer** — Outer wrapper providing perspective and mouse tracking. Shares mouse state via Svelte context.
- **CardBody** — Inner container with `transform-style: preserve-3d`.
- **CardItem** — Individual element with configurable 3D transform on hover.

## Props

### CardContainer

| Prop             | Type     | Default | Description                   |
| ---------------- | -------- | ------- | ----------------------------- |
| `class`          | `string` | `''`    | Classes for the inner wrapper |
| `containerClass` | `string` | `''`    | Classes for the outer wrapper |

### CardBody

| Prop    | Type     | Default | Description              |
| ------- | -------- | ------- | ------------------------ |
| `class` | `string` | `''`    | Classes for the body div |

### CardItem

| Prop         | Type               | Default | Description                    |
| ------------ | ------------------ | ------- | ------------------------------ |
| `as`         | `string`           | `'div'` | HTML element to render as      |
| `class`      | `string`           | `''`    | Additional classes             |
| `translateX` | `number \| string` | `0`     | X translation on hover (px)    |
| `translateY` | `number \| string` | `0`     | Y translation on hover (px)    |
| `translateZ` | `number \| string` | `0`     | Z translation (depth) on hover |
| `rotateX`    | `number \| string` | `0`     | X rotation on hover (deg)      |
| `rotateY`    | `number \| string` | `0`     | Y rotation on hover (deg)      |
| `rotateZ`    | `number \| string` | `0`     | Z rotation on hover (deg)      |

## Usage

```svelte
<CardContainer>
	<CardBody class="bg-card w-[20rem] rounded-xl border p-6">
		<CardItem translateZ={50} class="text-xl font-bold">Title</CardItem>
		<CardItem translateZ={100}>
			<img src="..." alt="..." class="rounded-xl" />
		</CardItem>
	</CardBody>
</CardContainer>
```
