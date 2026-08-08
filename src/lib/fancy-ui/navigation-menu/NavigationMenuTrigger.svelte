<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface NavigationMenuTriggerProps {
		/** The trigger's label. */
		children?: Snippet;
		/** Additional CSS classes. */
		class?: string;
		/** Element reference. */
		ref?: HTMLButtonElement | null;
	}
</script>

<script lang="ts">
	import { getContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import { NAVIGATION_MENU_KEY, type NavigationMenuContext } from "./types.js";
	import { NAVIGATION_MENU_ITEM_KEY, type NavigationMenuItemContext } from "./types.js";

	let { children, class: className, ref = $bindable(null) }: NavigationMenuTriggerProps = $props();

	const item = getContext<NavigationMenuItemContext>(NAVIGATION_MENU_ITEM_KEY);
	const root = getContext<NavigationMenuContext>(NAVIGATION_MENU_KEY);

	const isOpen = $derived(root.value === item.value);
	const tabIndexAttr = $derived(root.focusedValue === item.value ? 0 : -1);

	$effect(() => {
		return root.registerTrigger(item.value);
	});

	// Click is immediate, no hover-intent delay — an explicit click is
	// already the user's decision, there is no "did they mean it" travel to
	// protect against the way there is for a pointer merely passing over the
	// row.
	function handleClick() {
		root.toggle(item.value);
		root.focus(item.value);
		// Deliberate, not incidental, the same reasoning as ToggleGroupItem: a
		// plain `<button>` is only guaranteed to take focus on click in some
		// browsers (macOS Safari notably does not, by default). Without this,
		// clicking a trigger would open its panel but leave the roving tab
		// stop — and DOM focus — wherever it last was.
		ref?.focus();
	}

	function handlePointerEnter() {
		root.scheduleOpen(item.value);
	}

	function handlePointerLeave() {
		root.scheduleClose();
	}

	// There is deliberately no `onfocus` handler opening the panel here. A
	// keyboard user tabbing *past* a trigger on their way elsewhere must not
	// open it — only Enter/Space/ArrowDown, an explicit request, does that.
	// It also happens to be exactly what keeps Escape well-behaved: closing
	// returns focus to this trigger (see `close()`), and if focus opened the
	// panel, that same programmatic refocus would reopen it immediately —
	// the pointer-and-keyboard fight the panel's own test file pins down.
	function handleKeydown(event: KeyboardEvent) {
		switch (event.key) {
			case "Enter":
			case " ":
			case "ArrowDown":
				event.preventDefault();
				root.open(item.value);
				root.focus(item.value);
				root.requestFocus(item.value);
				break;
			case "ArrowRight":
				event.preventDefault();
				root.move(item.value, 1);
				break;
			case "ArrowLeft":
				event.preventDefault();
				root.move(item.value, -1);
				break;
			case "Home":
				event.preventDefault();
				root.moveToEdge("first");
				break;
			case "End":
				event.preventDefault();
				root.moveToEdge("last");
				break;
		}
	}

	const classes = $derived(
		cn(
			"ft-navigation-menu-trigger text-muted-foreground inline-flex cursor-pointer items-center gap-1 rounded-[8px] px-[14px] py-[8px] text-[13px] font-medium transition-colors",
			"hover:bg-accent hover:text-accent-foreground focus-visible:outline-none",
			isOpen && "bg-accent text-accent-foreground",
			className
		)
	);
</script>

<button
	bind:this={ref}
	type="button"
	id={item.triggerId}
	data-ft-nav-trigger
	data-value={item.value}
	class={classes}
	aria-expanded={isOpen}
	aria-controls={isOpen ? item.contentId : undefined}
	tabindex={tabIndexAttr}
	onclick={handleClick}
	onpointerenter={handlePointerEnter}
	onpointerleave={handlePointerLeave}
	onkeydown={handleKeydown}
>
	{@render children?.()}
	<span class="ft-navigation-menu-caret" aria-hidden="true">▾</span>
</button>

<style>
	/*
	 * Reduced motion keeps the whole rotation, not just its transition, out of
	 * the base rule set — the caret is decorative (open/closed state is
	 * already carried by `aria-expanded`), so under reduced motion it simply
	 * stays put rather than only losing the animated easing between states.
	 */
	@media (prefers-reduced-motion: no-preference) {
		.ft-navigation-menu-caret {
			display: inline-block;
			transition: transform 150ms ease;
		}

		.ft-navigation-menu-trigger[aria-expanded="true"] .ft-navigation-menu-caret {
			transform: rotate(180deg);
		}
	}
</style>
