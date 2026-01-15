<!--
  TEMPLATE: Component.svelte

  Instructions:
  1. Copy this entire folder to src/lib/fancy-ui/[component-name]/
  2. Rename this file to [ComponentName].svelte (PascalCase)
  3. Replace all [ComponentName] placeholders with actual name
  4. Replace all [component-name] placeholders with kebab-case name
  5. Update props interface based on reference design
  6. Implement the component logic
  7. Delete this comment block when done
-->
<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	/**
	 * Props for [ComponentName]
	 *
	 * Update this interface based on the reference design's props.
	 * Use JSDoc comments for each prop to enable IDE documentation.
	 */
	export interface ComponentNameProps {
		/** Additional CSS classes */
		class?: string;
		/** Component content */
		children?: Snippet;
		// TODO: Add component-specific props here
		// Example:
		// /** Animation duration in seconds */
		// duration?: number;
	}
</script>

<script lang="ts">
	import { cn } from '$lib/utils.js';

	let {
		class: className,
		children,
		// TODO: Destructure additional props with defaults
		...restProps
	}: ComponentNameProps = $props();

	// ==========================================================================
	// Reactive State
	// Use $state() for mutable reactive values
	// ==========================================================================
	// let isActive = $state(false);

	// ==========================================================================
	// Derived Values
	// Use $derived() for computed values that depend on props or state
	// ==========================================================================
	// const computedValue = $derived(someProp * 2);

	// ==========================================================================
	// Effects
	// Use $effect() for side effects (DOM manipulation, subscriptions, etc.)
	// ==========================================================================
	// $effect(() => {
	//   // Runs when dependencies change
	//   return () => {
	//     // Cleanup function (optional)
	//   };
	// });

	// ==========================================================================
	// Event Handlers
	// Define handlers as functions, use onclick={handler} syntax in template
	// ==========================================================================
	// function handleClick(event: MouseEvent) {
	//   event.preventDefault();
	//   // Handle click
	// }
</script>

<!--
  Template Structure:
  - Use semantic HTML elements
  - Apply cn() for class merging with className prop
  - Use {@render children?.()} for slot content
  - Use Svelte 5 event syntax: onclick={handler}
-->
<div
	class={cn(
		// Base styles
		'relative',
		// TODO: Add component styles using Tailwind classes
		// Prefer theme tokens: bg-background, text-foreground, border-border, etc.
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>

<style>
	/*
	 * Component-scoped styles
	 *
	 * Use this section for:
	 * - CSS animations (@keyframes)
	 * - CSS custom properties (--component-*)
	 * - Complex selectors that can't be done with Tailwind
	 *
	 * Prefer Tailwind classes in the template when possible.
	 * Use :global() sparingly for animation classes.
	 */
</style>
