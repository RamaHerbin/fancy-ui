<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { HTMLButtonAttributes } from "svelte/elements";

	export interface DropdownMenuTriggerOwnProps {
		/** Disables the trigger — the menu cannot be opened. */
		disabled?: boolean;
		/** The trigger's content. */
		children?: Snippet;
		/** Additional CSS classes, merged onto the trigger. */
		class?: string;
		/** Bindable reference to the trigger button. */
		ref?: HTMLButtonElement | null;
	}

	/** Native `<button>` attributes and listeners are forwarded to the trigger; the managed ARIA, `id` and `type` stay the component's. */
	export type DropdownMenuTriggerProps = DropdownMenuTriggerOwnProps &
		Omit<HTMLButtonAttributes, keyof DropdownMenuTriggerOwnProps>;
</script>

<script lang="ts">
	import { getContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import { DROPDOWN_MENU_KEY, type DropdownMenuRootContext } from "./types.js";

	let {
		disabled = false,
		children,
		class: className,
		ref = $bindable(null),
		onclick,
		onkeydown,
		...rest
	}: DropdownMenuTriggerProps = $props();

	// `DropdownMenu` only ever mounts this alongside `DropdownMenuContent`
	// under its own context, so there is no standalone-usage fallback to
	// design for — the same assumption `PopoverContent` and `SelectPanel`
	// make about their own root's context.
	const ctx = getContext<DropdownMenuRootContext>(DROPDOWN_MENU_KEY);

	$effect(() => {
		ctx.setTriggerRef(ref);
		return () => ctx.setTriggerRef(null);
	});

	function handleClick(
		event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }
	): void {
		if (disabled) return;
		if (ctx.open) {
			// Focus is already here — it's the element that was just clicked —
			// so there is nothing for a forced `.focus()` to do.
			ctx.close({ returnFocus: false });
		} else {
			ctx.openWithFocus("first");
		}
		(onclick as ((e: typeof event) => void) | null | undefined)?.(event);
	}

	function handleKeydown(
		event: KeyboardEvent & { currentTarget: EventTarget & HTMLButtonElement }
	): void {
		if (disabled) return;
		switch (event.key) {
			case "Enter":
			case " ":
			case "ArrowDown":
				event.preventDefault();
				ctx.openWithFocus("first");
				break;
			case "ArrowUp":
				event.preventDefault();
				ctx.openWithFocus("last");
				break;
		}
		(onkeydown as ((e: typeof event) => void) | null | undefined)?.(event);
	}

	const classes = $derived(
		cn(
			"ft-dropdown-menu-trigger border-border text-foreground hover:bg-accent hover:text-accent-foreground inline-flex cursor-pointer items-center gap-1.5 rounded-[8px] border px-[14px] py-[7px] text-[12px] font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--ft-nav-accent)]/35 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
			className
		)
	);
</script>

<button
	{...rest}
	bind:this={ref}
	id={ctx.triggerId}
	type="button"
	{disabled}
	class={classes}
	aria-haspopup="menu"
	aria-expanded={ctx.open}
	aria-controls={ctx.open ? ctx.contentId : undefined}
	onclick={handleClick}
	onkeydown={handleKeydown}
>
	{@render children?.()}
</button>

<style>
	.ft-dropdown-menu-trigger {
		--ft-nav-accent: var(
			--ft-accent,
			light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
		);
	}
</style>
