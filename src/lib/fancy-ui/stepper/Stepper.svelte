<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface StepperProps {
		/** The active step's 0-based index. Bindable. */
		current?: number;
		/** Called with the new index whenever it changes, however the change happened. */
		onCurrentChange?: (current: number) => void;
		/** The rail's stacking axis. Defaults to `"horizontal"`. */
		orientation?: "horizontal" | "vertical";
		/** Whether steps render as buttons a reader can click to jump between them. Defaults to `false`. */
		clickable?: boolean;
		/** Called with a step's index when it's activated by a click. Only fires when `clickable`. */
		onStepClick?: (index: number) => void;
		/** The `Step`s. */
		children?: Snippet;
		/** Additional CSS classes */
		class?: string;
		/** Element reference */
		ref?: HTMLOListElement | null;
	}
</script>

<script lang="ts">
	import { setContext, untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import { STEPPER_KEY, type StepperContext } from "./types.js";

	let {
		current = $bindable(0),
		onCurrentChange,
		orientation = "horizontal",
		clickable = false,
		onStepClick,
		children,
		class: className,
		ref = $bindable(null),
	}: StepperProps = $props();

	// Ids, not elements: a `Step` can register the instant its own `$effect`
	// runs, with no need to wait on a `bind:this` to have landed first. A
	// plain $state array (not a Set) — Svelte's deep proxy tracks
	// push/splice on arrays, but a bare `$state(new Set())` would not notify
	// subscribers on `.add`/`.delete`.
	let registered = $state<string[]>([]);

	// Both functions are commands, invoked from a Step's own `$effect` —
	// register on mount, then again as that effect's cleanup, to
	// unregister. The *entire* body has to run inside `untrack`, not just
	// the `includes`/`indexOf` lookup: `.push()`/`.splice()` also read the
	// proxy to do their job, so untracking only the lookup still leaves the
	// mutating call itself tracked. Whichever read is left outside
	// `untrack` is enough to make the calling effect depend on the very
	// array its own call just mutated — it then sees itself as stale the
	// instant the write lands, and register/unregister alternate forever
	// until Svelte throws `effect_update_depth_exceeded`. This is the exact
	// bug ToggleGroup's register/unregister guards against; see its
	// comments for the fuller account.
	function register(id: string): () => void {
		untrack(() => {
			if (!registered.includes(id)) registered.push(id);
		});
		return () => {
			untrack(() => {
				const index = registered.indexOf(id);
				if (index !== -1) registered.splice(index, 1);
			});
		};
	}

	function indexOf(id: string): number {
		return registered.indexOf(id);
	}

	function select(index: number) {
		if (!clickable) return;
		onStepClick?.(index);
		current = index;
		onCurrentChange?.(index);
	}

	const context: StepperContext = {
		get orientation() {
			return orientation;
		},
		get clickable() {
			return clickable;
		},
		get current() {
			return current;
		},
		get count() {
			return registered.length;
		},
		register,
		indexOf,
		select,
	};

	setContext(STEPPER_KEY, context);
</script>

<ol
	bind:this={ref}
	class={cn(
		"ft-stepper flex list-none",
		orientation === "vertical" ? "flex-col" : "w-full items-start",
		className
	)}
	data-orientation={orientation}
>
	{#if children}
		{@render children()}
	{/if}
</ol>

<!--
  No scoped <style> here: the root `<ol>` itself never paints the brand
  purple — only a `Step`'s current bullet, halo, and done connector do — so
  `--ft-nav-accent` is declared there instead, the same split ToggleGroup
  (no purple of its own) and ToggleGroupItem (declares
  `--ft-toggle-group-accent` locally for its focus ring) already use.
-->
