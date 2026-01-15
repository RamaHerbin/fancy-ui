# Project: fancy-ui

## Purpose
This repository ports selected components from the FancyUI (Vue/Nuxt) project into idiomatic Svelte components using SvelteKit, Tailwind CSS, and shadcn-svelte.

This is a reimplementation project, not a line-by-line translation.

## Repository structure

### Source (Svelte)
- `src/lib/components/ui/`  
  shadcn-svelte generated primitives (Button, Card, Tabs, etc.)

- `src/lib/fancy-ui/`  
  Svelte ports of FancyUI components (one folder per component)

- `src/lib/examples/`  
  Svelte ports of FancyUI example compositions (usage demos)

- `src/lib/blocks/`  
  Svelte ports of FancyUI blocks (hero sections, testimonials, etc.)

- `src/routes/demo/`  
  Demo pages showcasing each ported component

### Vendor (Vue - READ-ONLY)
- `vendor/inspira/ui/`  
  Core UI components (149+ components)

- `vendor/inspira/examples/`  
  Example compositions showing how to use components (43+ demos)

- `vendor/inspira/blocks/`  
  Pre-built page sections (hero, testimonials, etc.)

## Hard rules
- Never modify files under `vendor/`.
- Never copy/paste Vue code line-by-line.
- Reimplement components idiomatically in Svelte.
- Preserve public API parity when reasonable (props, slots, events).
- Prefer shadcn-svelte primitives from `$lib/components/ui`.
- Prefer theme tokens (`bg-background`, `text-foreground`, `bg-primary`) over hardcoded colors.

## Svelte 5 conventions
- Use `$state()` for reactive state (replaces `let` + reactivity)
- Use `$derived()` for computed values (replaces `$:`)
- Use `$effect()` for side effects (replaces `$:` statements with side effects)
- Use `$props()` for component props
- Use `bind:this` for DOM references
- Use `onMount` with cleanup return for DOM listeners
- Use `onclick={handler}` syntax (not `on:click`)

## Porting workflow

### For UI Components (`vendor/inspira/ui/` → `src/lib/fancy-ui/`)
For each component X:
1. Read the source Vue component in `vendor/inspira/ui/x/`
2. Extract public API (props, slots, events)
3. Reimplement in Svelte:
   - `src/lib/fancy-ui/x/X.svelte`
   - `src/lib/fancy-ui/x/index.ts` (re-exports)
4. Create a demo page:
   - `src/routes/demo/x/+page.svelte`
5. Add short notes:
   - `src/lib/fancy-ui/x/README.md`
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

## Component Architecture Guidelines

### File Structure
```
src/lib/fancy-ui/component-name/
├── ComponentName.svelte          # Main component
├── types.ts                      # TypeScript definitions
├── utils.ts                      # Component-specific utilities
├── index.ts                      # Re-exports
└── README.md                     # Porting notes
```

### Naming Conventions
- Use PascalCase for component names
- Use kebab-case for folder names
- Prefix internal utilities with component name
- Keep prop names consistent with Vue version when reasonable

### Performance Considerations
- Use `$derived` instead of functions in templates
- Implement proper cleanup in `$effect` when needed
- Use `requestAnimationFrame` for smooth animations
- Debounce/throttle expensive operations

### Accessibility
- Preserve ARIA attributes from Vue components
- Ensure keyboard navigation works
- Add proper focus management
- Include screen reader support

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

## Demo Page Requirements

Each ported component MUST have a demo page at `src/routes/demo/[component]/+page.svelte`.

### Demo Page Structure
```svelte
<script lang="ts">
  import { ComponentName } from '$lib/fancy-ui/component-name';
</script>

<svelte:head>
  <title>ComponentName - FancyUI</title>
</svelte:head>

<div class="container mx-auto py-12 px-4">
  <h1 class="text-3xl font-bold mb-2">ComponentName</h1>
  <p class="text-muted-foreground mb-8">Brief description of the component.</p>
  
  <!-- Basic Example -->
  <section class="mb-12">
    <h2 class="text-xl font-semibold mb-4">Basic Usage</h2>
    <div class="border rounded-lg p-6 bg-card">
      <ComponentName />
    </div>
  </section>
  
  <!-- Variations -->
  <section class="mb-12">
    <h2 class="text-xl font-semibold mb-4">Variations</h2>
    <!-- Show different prop combinations -->
  </section>
</div>
```

### Demo Page Checklist
- [ ] Basic usage example
- [ ] All prop variations demonstrated
- [ ] Event handling examples (if applicable)
- [ ] Dark/light theme preview
- [ ] Mobile responsive layout
- [ ] Code snippets for usage (optional)

## Home Page (`src/routes/+page.svelte`)

The home page should serve as an index of all ported components:
- List all available components with links to `/demo/[component]`
- Show porting status (done, in progress, planned)
- Group by category if needed

## Testing Strategy

### Validation Checklist
- [ ] Visual parity with Vue version
- [ ] All props work as expected
- [ ] Events are properly dispatched
- [ ] Animations are smooth
- [ ] Responsive behavior matches
- [ ] Accessibility is preserved
- [ ] TypeScript types are accurate
- [ ] Performance is acceptable

## Commands
- pnpm dev
- pnpm check
- pnpm lint (if configured)

## Component Priority List

Based on complexity and utility, suggested porting order:

### Tier 1 (Foundation)
- AnimatedBeam - SVG animations, path calculations
- Dock - Mouse tracking, magnification effects
- BorderBeam - CSS animations, border effects
- GlowBorder - Simple styling component

### Tier 2 (Interactive)
- Compare - Complex interaction, drag/hover modes
- DirectionAwareHover - Mouse direction detection
- CardSpotlight - Mouse tracking, spotlight effects
- AnimatedTooltip - Positioning, hover states

### Tier 3 (Advanced)
- FileTree - Recursive components, state management
- ColorPicker - Complex form component
- Carousel3D - 3D transforms, touch gestures
- AnimatedTestimonials - Auto-rotation, transitions

### Tier 4 (Specialized)
- Background components (Stars, Neural, Silk, etc.)
- Mockup components (iPhone, Safari, etc.)
- Complex animations (Lens, Morphing, Particle effects)
