# Component Template

This template provides the starting point for implementing FancyUI components to Svelte.

## Quick Start

```bash
# 1. Copy the template folder
cp -r src/lib/fancy-ui/_template src/lib/fancy-ui/[component-name]

# 2. Rename the component file
mv src/lib/fancy-ui/[component-name]/Component.svelte \
   src/lib/fancy-ui/[component-name]/[ComponentName].svelte

# 3. Update index.ts imports and exports

# 4. Add to src/lib/fancy-ui/index.ts
```

## File Structure

```
src/lib/fancy-ui/[component-name]/
├── [ComponentName].svelte    # Main component
├── types.ts                  # Component-specific types (optional)
├── index.ts                  # Barrel exports
└── README.md                 # Porting notes
```

## Implementation Workflow

### Step 1: Analyze the Reference Design

1. Open the Vue component in `vendor/inspira/ui/[component]/`
2. Identify:
   - **Props**: What configuration does it accept?
   - **Slots**: What content areas does it have?
   - **Events**: What events does it emit?
   - **State**: What internal state does it manage?
   - **Animations**: What CSS/JS animations does it use?

### Step 2: Create the Svelte Component

Use this mapping guide:

| Vue Pattern | Svelte 5 Equivalent |
|-------------|---------------------|
| `defineProps<T>()` | `let { ... }: T = $props()` |
| `ref(value)` | `let value = $state(initialValue)` |
| `computed(() => ...)` | `const value = $derived(...)` |
| `watch(dep, callback)` | `$effect(() => { ... })` |
| `<slot />` | `{@render children?.()}` |
| `<slot name="x" />` | `{@render slotName?.()}` |
| `emit('event', data)` | Pass callback prop or use CustomEvent |
| `:class="{ active }"` | `class:active` or `cn(..., { active })` |
| `v-if` | `{#if condition}` |
| `v-for` | `{#each items as item}` |
| `@click` | `onclick={handler}` |
| `@click.prevent` | `onclick={(e) => { e.preventDefault(); ... }}` |

### Step 3: Handle Styling

1. **Prefer Tailwind classes** in the template
2. **Use theme tokens** for colors:
   - `bg-background`, `bg-card`, `bg-primary`
   - `text-foreground`, `text-muted-foreground`
   - `border-border`, `ring-ring`
3. **Use `cn()` utility** for class merging:
   ```svelte
   <div class={cn('base-styles', className)} />
   ```
4. **Scoped styles** for animations:
   ```svelte
   <style>
     @keyframes custom {
       from { opacity: 0; }
       to { opacity: 1; }
     }
   </style>
   ```

### Step 4: Export the Component

1. Update `index.ts`:
   ```typescript
   import ComponentName, { type ComponentNameProps } from './ComponentName.svelte';
   export { ComponentName, type ComponentNameProps };
   ```

2. Add to `src/lib/fancy-ui/index.ts`:
   ```typescript
   export * from './component-name';
   ```

### Step 5: Create Demo Page

Create `src/routes/demo/[component-name]/+page.svelte`:

```svelte
<script lang="ts">
  import { ComponentName } from '$lib/fancy-ui/component-name';
</script>

<svelte:head>
  <title>ComponentName - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl py-12 px-4">
  <h1 class="text-3xl font-bold mb-2">ComponentName</h1>
  <p class="text-muted-foreground mb-8">Description here.</p>

  <section class="mb-12">
    <h2 class="text-xl font-semibold mb-4">Basic Usage</h2>
    <div class="rounded-lg border bg-card p-6">
      <ComponentName />
    </div>
  </section>
</div>
```

### Step 6: Update Demo Index

Add to the components array in `src/routes/demo/+page.svelte`:

```typescript
{
  name: 'ComponentName',
  href: '/demo/component-name',
  description: 'Brief description',
  status: 'done'
}
```

## Svelte 5 Patterns

### Props with Defaults

```svelte
<script lang="ts">
  interface Props {
    duration?: number;
    class?: string;
  }

  let {
    duration = 1000,
    class: className,
    ...restProps
  }: Props = $props();
</script>
```

### Reactive State

```svelte
<script lang="ts">
  let count = $state(0);
  let items = $state<string[]>([]);

  function increment() {
    count++;
  }
</script>
```

### Derived Values

```svelte
<script lang="ts">
  let { width, height } = $props();

  const area = $derived(width * height);
  const isLarge = $derived(area > 1000);
</script>
```

### Effects with Cleanup

```svelte
<script lang="ts">
  let element: HTMLElement;

  $effect(() => {
    const observer = new ResizeObserver(handleResize);
    observer.observe(element);

    return () => observer.disconnect();
  });
</script>
```

### Bindable Props

```svelte
<script lang="ts">
  interface Props {
    value?: number;
  }

  let { value = $bindable(0) }: Props = $props();
</script>
```

### Event Handlers

```svelte
<script lang="ts">
  interface Props {
    onclick?: (event: MouseEvent) => void;
  }

  let { onclick }: Props = $props();

  function handleClick(event: MouseEvent) {
    // Internal logic
    onclick?.(event);
  }
</script>

<button onclick={handleClick}>Click me</button>
```

## Checklist

Before marking a component as done:

- [ ] All props from reference design are supported
- [ ] Slots/children render correctly
- [ ] Events work as expected
- [ ] Animations are smooth
- [ ] Dark mode looks correct
- [ ] Disabled states work
- [ ] Keyboard navigation works (if applicable)
- [ ] `pnpm check` passes
- [ ] Demo page shows all variants
- [ ] README.md documents any differences from reference design

## Common Issues

### TypeScript Errors with Event Handlers

Use explicit typing:
```svelte
<button onclick={(e: MouseEvent) => handleClick(e)}>
```

### Class Prop Conflicts

Always rename `class` to `className`:
```svelte
let { class: className }: Props = $props();
```

### Animation Not Working

Ensure keyframes are in `<style>` block and class is applied:
```svelte
<style>
  @keyframes fade {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .animate-fade {
    animation: fade 0.3s ease-out;
  }
</style>
```

### Reactive Value Not Updating

Use `$state()` for mutable values, not `let`:
```svelte
// Wrong
let count = 0;

// Correct
let count = $state(0);
```
