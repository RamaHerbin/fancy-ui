# Vue → Svelte Porting Guide

Reference guide for porting InspiraUI (Vue/Nuxt) components to idiomatic Svelte.

## Vue Component Analysis

After analyzing 149+ Vue components in `vendor/inspira/ui/`, here are the key patterns:

### Common Props Patterns
- **class**: Almost all components accept a `class` prop for CSS customization
- **Styling props**: Many components have color, size, animation duration props
- **Behavioral props**: Components often have mode switches (e.g., `slideMode: "hover" | "drag"`)
- **Configuration objects**: Complex components use config objects (e.g., `globeConfig`, `springConfig`)

### TypeScript Patterns
```vue
// Vue pattern
interface Props {
  class?: string;
  duration?: number;
  colors?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  duration: 1000,
  colors: () => ["#FF0000", "#00FF00"]
});
```

### Event Patterns
- Components emit events like `update:percentage`, `drag:start`, `hover:enter`
- Touch events are handled separately from mouse events
- Many components have interaction state management

### Slot Patterns
- Default slots for content
- Named slots for specific areas (e.g., `handle`, `first-content`, `second-content`)
- Slots often have fallback content

### Animation Patterns
- Heavy use of CSS animations with dynamic values
- SVG animations for complex effects
- RequestAnimationFrame for smooth interactions
- ResizeObserver for responsive behavior

### State Management
- Reactive refs for component state
- Computed properties for derived values
- Watchers for prop changes
- Lifecycle hooks for setup/cleanup

## Svelte Porting Patterns

### Props → Props
```svelte
<!-- Svelte equivalent -->
<script lang="ts">
  interface Props {
    class?: string;
    duration?: number;
    colors?: string[];
  }

  let {
    class: className = '',
    duration = 1000,
    colors = ['#FF0000', '#00FF00'],
    ...restProps
  }: Props = $props();
</script>
```

### Vue ref() → Svelte $state()
```svelte
<!-- Vue: const isActive = ref(false) -->
<script lang="ts">
  let isActive = $state(false);
</script>
```

### Vue computed() → Svelte $derived()
```svelte
<!-- Vue: const computedValue = computed(() => prop1 + prop2) -->
<script lang="ts">
  let computedValue = $derived(prop1 + prop2);
</script>
```

### Vue watch() → Svelte $effect()
```svelte
<!-- Vue: watch(prop, (newVal) => { ... }) -->
<script lang="ts">
  $effect(() => {
    // Runs when prop changes
    console.log(prop);
  });
</script>
```

### Vue emit → Svelte events
```svelte
<!-- Vue: emit('update:value', newValue) -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher<{
    'update:value': number;
  }>();

  function updateValue(newValue: number) {
    dispatch('update:value', newValue);
  }
</script>
```

### Vue provide/inject → Svelte context
```svelte
<!-- Vue: provide(key, value) / inject(key) -->
<script lang="ts">
  import { setContext, getContext } from 'svelte';

  // Provider
  setContext('key', value);

  // Consumer
  const value = getContext<Type>('key');
</script>
```

### Vue slots → Svelte slots
```svelte
<!-- Vue: <slot name="header" :data="data" /> -->
<!-- Svelte: -->
<slot name="header" {data}></slot>

<!-- Usage -->
{#snippet header(data)}
  <h1>{data.title}</h1>
{/snippet}
<Component {header} />
```

## Common Porting Challenges

### 1. Vue Transitions → Svelte Transitions
```svelte
<!-- Vue: <Transition name="fade"> -->
<!-- Svelte: -->
<script>
  import { fade } from 'svelte/transition';
</script>

{#if visible}
  <div transition:fade>Content</div>
{/if}
```

### 2. Dynamic Classes
```svelte
<!-- Vue: :class="{ active: isActive, disabled }" -->
<!-- Svelte: -->
<div class:active={isActive} class:disabled></div>

<!-- Or with cn utility: -->
<div class={cn('base-class', { active: isActive, disabled })}></div>
```

### 3. Template Refs
```svelte
<!-- Vue: ref="elementRef" -->
<!-- Svelte: -->
<script>
  let elementRef: HTMLElement;
</script>

<div bind:this={elementRef}></div>
```

### 4. Event Modifiers (Svelte 5)
```svelte
<!-- Vue: @click.prevent.stop -->
<!-- Svelte 5: -->
<script lang="ts">
  function handler(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    // ... logic
  }
</script>

<button onclick={handler}>Click</button>
```

## Porting Workflow

### For UI Components (`vendor/inspira/ui/` → `src/lib/ui/`)
For each component X:
1. Read the source Vue component in `vendor/inspira/ui/x/`
2. Extract public API (props, slots, events)
3. Reimplement in Svelte:
   - `src/lib/ui/x/X.svelte`
   - `src/lib/ui/x/index.ts` (re-exports)
4. Create a demo page:
   - `src/routes/demo/x/+page.svelte`
5. Add short notes:
   - `src/lib/ui/x/README.md`
6. Update the home page index

### For Examples (`vendor/inspira/examples/` → `src/lib/examples/`)
Examples show real-world usage of components. For each example:
1. Read the Vue example in `vendor/inspira/examples/XDemo.vue`
2. Ensure the required component(s) are already ported
3. Reimplement in Svelte:
   - `src/lib/examples/XDemo.svelte`
4. Use the example in the component's demo page

### For Blocks (`vendor/inspira/blocks/` → `src/lib/blocks/`)
Blocks are pre-built page sections. For each block:
1. Read the Vue block in `vendor/inspira/blocks/category/BlockName.vue`
2. Ensure required components are ported
3. Reimplement in Svelte:
   - `src/lib/blocks/category/BlockName.svelte`
4. Create a demo page if needed
