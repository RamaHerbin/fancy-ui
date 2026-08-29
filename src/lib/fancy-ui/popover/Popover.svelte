<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { Side, Align } from "../_internals/anchor-position.js";

	export interface PopoverProps {
		/** Whether the panel is open. Bindable. */
		open?: boolean;
		/** Called with the new value whenever the panel opens or closes, however the change happened. */
		onOpenChange?: (open: boolean) => void;
		/** Side of the trigger to place the panel on. */
		side?: Side;
		/** Alignment along the trigger's cross axis. */
		align?: Align;
		/** Gap in pixels between the trigger and the panel. */
		offset?: number;
		/** Whether Escape and an outside click close the panel. */
		dismissible?: boolean;
		/**
		 * The trigger's content. Rendered inside the real `<button>` this
		 * component owns — keep it to text/icons, not another interactive
		 * control, or activation ends up on two nested buttons at once.
		 */
		trigger?: Snippet;
		/** The panel's content. */
		children?: Snippet;
		/** Additional CSS classes, merged onto the panel. */
		class?: string;
		/** Bindable reference to the panel element. */
		ref?: HTMLDivElement | null;
		/**
		 * Plays the matching open/close cue through the sound controller. Off by
		 * default; only audible once the user has enabled sound.
		 */
		sound?: boolean;
	}
</script>

<script lang="ts">
	import { setContext } from "svelte";
	import { POPOVER_KEY, type PopoverContext } from "./types.js";
	import PopoverContent from "./PopoverContent.svelte";
	import { sound as soundFx } from "../sound/sound.svelte.js";

	let {
		open = $bindable(false),
		onOpenChange,
		side = "bottom",
		align = "center",
		offset = 8,
		dismissible = true,
		trigger,
		children,
		class: className,
		ref = $bindable(null),
		sound = false,
	}: PopoverProps = $props();

	// The trigger's `aria-controls` target. The panel isn't mounted at all
	// until `open` is true, so the attribute itself is gated on `open` too
	// (see the button below) — otherwise it would reference this id for the
	// entire closed lifetime of the component, which is most of it, with
	// nothing in the DOM behind it. `$props.id()`, not `_internals/id.js`'s
	// `uid()`, because it needs to agree with itself from the first
	// server-rendered paint, not just after hydration.
	const contentId = $props.id();

	let triggerRef: HTMLButtonElement | null = $state(null);

	// The one place `open` changes. A plain function, not an `$effect` —
	// writing `open` there would mean reading and writing the same state in
	// one pass, and would fight a caller's own `bind:open` write.
	function setOpen(next: boolean) {
		if (open === next) return;
		open = next;
		if (sound) soundFx.play(next ? "open" : "close");
		onOpenChange?.(next);
	}

	function toggle() {
		setOpen(!open);
	}

	function close() {
		setOpen(false);
	}

	const context: PopoverContext = {
		get contentId() {
			return contentId;
		},
		get side() {
			return side;
		},
		get align() {
			return align;
		},
		get offset() {
			return offset;
		},
		get dismissible() {
			return dismissible;
		},
		get triggerRef() {
			return triggerRef;
		},
		// A getter, and read at the moment each direction of the panel's
		// transition starts — not a value copied into the context once. The
		// panel is mid-exit for 150 ms after `open` flips false, and during
		// that window Svelte has marked the branch inert and stopped running
		// its effects, so nothing reactive inside the panel would ever see a
		// new value. Reading through this getter always does.
		get open() {
			return open;
		},
		close,
	};
	setContext(POPOVER_KEY, context);
</script>

<button
	bind:this={triggerRef}
	type="button"
	class="ft-popover-trigger border-border text-foreground hover:bg-accent hover:text-accent-foreground inline-flex cursor-pointer items-center gap-1.5 rounded-[8px] border px-[14px] py-[7px] text-[12px] font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--ft-overlay-accent)]/35 focus-visible:outline-none"
	aria-expanded={open}
	aria-controls={open ? contentId : undefined}
	onclick={toggle}
>
	{@render trigger?.()}
</button>

{#if open}
	<PopoverContent bind:ref class={className}>
		{@render children?.()}
	</PopoverContent>
{/if}

<style>
	.ft-popover-trigger {
		--ft-overlay-accent: var(
			--ft-accent,
			light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
		);
	}
</style>
