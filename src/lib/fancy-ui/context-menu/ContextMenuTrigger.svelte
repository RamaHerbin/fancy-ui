<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface ContextMenuTriggerProps {
		/** Disables the region: `contextmenu` is left alone and the browser's native menu shows instead. */
		disabled?: boolean;
		/** The wrapped region's content. */
		children?: Snippet;
		/** Additional CSS classes, merged onto the wrapping element. */
		class?: string;
		/** Bindable reference to the wrapping element. */
		ref?: HTMLDivElement | null;
	}
</script>

<script lang="ts">
	import { getContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import { CONTEXT_MENU_KEY, type ContextMenuRootContext } from "./types.js";

	let {
		disabled = false,
		children,
		class: className,
		ref = $bindable(null),
	}: ContextMenuTriggerProps = $props();

	const ctx = getContext<ContextMenuRootContext>(CONTEXT_MENU_KEY);

	// How the keyboard path (the Menu key, Shift+F10) is told apart from a
	// real right-click: both dispatch the same `contextmenu` event — there is
	// no separate keyboard event to listen for — but `event.button` reports
	// which mouse button actually fired it, and a keyboard-synthesized
	// `contextmenu` reports `0` (the same value a synthetic/keyboard-sourced
	// event always carries), never `2` (the right mouse button). That is not
	// an inference about where the pointer probably wasn't — it is what the
	// event states about its own origin — so it holds even for a genuine
	// right-click at the literal viewport corner, unlike a coordinate-based
	// guess. The keyboard path still has no real pointer position to open
	// at, so it falls back to this region's own rect, same as before.
	function handleContextMenu(event: MouseEvent): void {
		if (disabled) return;
		event.preventDefault();
		const isKeyboardInvoked = event.button !== 2;
		if (isKeyboardInvoked && ref) {
			const rect = ref.getBoundingClientRect();
			ctx.openAt(rect.left, rect.top);
		} else {
			ctx.openAt(event.clientX, event.clientY);
		}
	}
</script>

<!--
	svelte-ignore a11y_no_static_element_interactions -- `contextmenu` is a
	pointer gesture with an OS-level keyboard equivalent (the Menu key,
	Shift+F10), not a role-driven interaction an AT user "activates" via
	Enter/Space the way a button or link is. There is no ARIA role that
	describes "right-clickable region", and inventing one (or borrowing
	`role="button"`) would claim a keyboard/AT interaction model this element
	doesn't actually offer. Relatedly, no `aria-haspopup`/`aria-expanded`/
	`aria-controls` either, unlike `DropdownMenuTrigger`: those describe a
	control a user *activates* to open something, and this wrapping element
	isn't one. See the README's Accessibility section for the same note.
-->
<div
	bind:this={ref}
	class={cn("ft-context-menu-trigger", className)}
	oncontextmenu={handleContextMenu}
>
	{@render children?.()}
</div>
