# Confetti

Confetti celebration effect powered by canvas-confetti.

## Components

### Confetti

Canvas wrapper that creates a confetti instance.

| Prop            | Type                    | Default | Description              |
| --------------- | ----------------------- | ------- | ------------------------ |
| `options`       | `ConfettiOptions`       | `{}`    | Default confetti options |
| `globalOptions` | `ConfettiGlobalOptions` | `{}`    | Canvas creation options  |
| `manualStart`   | `boolean`               | `false` | Skip auto-fire on mount  |
| `class`         | `string`                | `''`    | Canvas CSS classes       |

### ConfettiButton

Button that fires confetti from its position.

| Prop      | Type              | Default | Description                                                                          |
| --------- | ----------------- | ------- | ------------------------------------------------------------------------------------ |
| `options` | `ConfettiOptions` | `{}`    | Confetti options for this button                                                     |
| `sound`   | `boolean`         | `false` | Plays the `press` cue when the button fires a burst, once the user has enabled sound |

## Sound

Set `sound` on `ConfettiButton` to play the `press` cue when it fires a burst, through the shared sound controller (see [`sound/README.md`](../sound/README.md)):

```svelte
<ConfettiButton sound>Celebrate</ConfettiButton>
```

It is opt-in and silent by default: nothing plays unless both `sound` is set on the button **and** the user has turned sound on globally (through `SoundToggle` or `sound.enable()`). The cue is `press`, not `success` — the button acknowledges a click, it doesn't resolve an outcome. It lives on `ConfettiButton` alone: `Confetti`'s own mount auto-fire (unless `manualStart` is set) and any imperative `fire()` call stay silent.
