# Confetti

Confetti celebration effect powered by canvas-confetti.

## Components

### Confetti
Canvas wrapper that creates a confetti instance.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `options` | `ConfettiOptions` | `{}` | Default confetti options |
| `globalOptions` | `ConfettiGlobalOptions` | `{}` | Canvas creation options |
| `manualstart` | `boolean` | `false` | Skip auto-fire on mount |
| `class` | `string` | `''` | Canvas CSS classes |

### ConfettiButton
Button that fires confetti from its position.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `options` | `ConfettiOptions` | `{}` | Confetti options for this button |
