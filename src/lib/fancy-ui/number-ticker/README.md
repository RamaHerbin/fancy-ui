# NumberTicker

Animated number counter with easing. Counts from 0 to `value` (or vice versa) when the element enters the viewport. Formatted using `Intl.NumberFormat`.

## Props

| Prop            | Type             | Default | Description                         |
| --------------- | ---------------- | ------- | ----------------------------------- |
| `value`         | `number`         | `0`     | Target number to animate to         |
| `direction`     | `'up' \| 'down'` | `'up'`  | Count 0→value or value→0            |
| `duration`      | `number`         | `1000`  | Animation duration (ms)             |
| `delay`         | `number`         | `0`     | Delay before animation starts (ms)  |
| `decimalPlaces` | `number`         | `0`     | Number of decimal places to display |
| `class`         | `string`         | `''`    | Additional CSS classes              |

## Usage

```svelte
<NumberTicker value={1234} />
<NumberTicker value={99.99} decimalPlaces={2} duration={2000} />
<NumberTicker value={100} direction="down" />
```
