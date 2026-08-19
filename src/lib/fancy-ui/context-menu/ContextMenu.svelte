<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { Side, Align } from "../_internals/anchor-position.js";

	export interface ContextMenuProps {
		/** Whether the menu is open. Bindable. */
		open?: boolean;
		/** Called with the new value whenever the menu opens or closes, however the change happened. */
		onOpenChange?: (open: boolean) => void;
		/** Side of the pointer to place the menu on. */
		side?: Side;
		/** Alignment along the pointer's cross axis. */
		align?: Align;
		/** Gap in pixels between the pointer and the menu. */
		offset?: number;
		/** Whether arrow-key navigation wraps at the ends. */
		loop?: boolean;
		/** The `ContextMenuTrigger` and `ContextMenuContent`. */
		children?: Snippet;
	}
</script>

<script lang="ts">
	import { setContext } from "svelte";
	import { portal } from "../_internals/portal.js";
	import { CONTEXT_MENU_KEY, type ContextMenuRootContext } from "./types.js";

	let {
		open = $bindable(false),
		onOpenChange,
		side = "bottom",
		align = "start",
		offset = 2,
		loop = true,
		children,
	}: ContextMenuProps = $props();

	const contentId = $props.id();

	let anchorRef: HTMLElement | null = null;
	let point = $state({ x: 0, y: 0 });

	// Captured the moment the menu opens, exactly the reasoning
	// `_internals/focus-trap.ts`'s own `previouslyFocused` uses for a modal
	// surface — except this component isn't modal and can't reuse that
	// module, so it borrows the pattern locally: remember what had focus,
	// restore it on close if it's still around.
	let previouslyFocused: HTMLElement | null = null;

	function setOpen(next: boolean, options: { returnFocus?: boolean } = {}): void {
		if (open === next) return;
		open = next;
		onOpenChange?.(next);
		if (!next && (options.returnFocus ?? true) && previouslyFocused?.isConnected) {
			previouslyFocused.focus();
		}
	}

	function openAt(x: number, y: number): void {
		// Opening a second context menu while this one is already open
		// replaces it rather than stacking: there is only ever one
		// `ContextMenuContent` per root, so moving `point` while `open` stays
		// true just repositions the same panel instead of mounting a second
		// one. Only remember the pre-open focus target the first time —
		// re-remembering it on a reposition would capture the menu's own
		// currently-focused item instead of what was focused before it opened
		// at all.
		if (!open) previouslyFocused = document.activeElement as HTMLElement | null;
		point = { x, y };
		setOpen(true);
	}

	function close(options: { returnFocus?: boolean } = {}): void {
		setOpen(false, options);
	}

	const context: ContextMenuRootContext = {
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
		get loop() {
			return loop;
		},
		get open() {
			return open;
		},
		get point() {
			return point;
		},
		get anchorRef() {
			return anchorRef;
		},
		setAnchorRef(el) {
			anchorRef = el;
		},
		openAt,
		close,
	};
	setContext(CONTEXT_MENU_KEY, context);
</script>

{@render children?.()}

<!--
	The virtual anchor `anchorPosition` positions `ContextMenuContent`
	against: a zero-size, `position: fixed` point at the last-opened pointer
	coordinates. `anchorPosition`'s `anchor` option needs a real element to
	call `getBoundingClientRect()` on — there is no DOM node at a right-click,
	so this one stands in for it. Kept mounted for this component's whole
	lifetime (not just while open) so it's already in place, positioned, and
	ready the instant `ContextMenuContent` asks for its rect.

	`use:portal`, same as `ContextMenuContent` itself: `position: fixed`
	resolves its containing block against the nearest ancestor that
	establishes one — not just `position`/`transform` on that ancestor, but
	`filter`, `perspective`, `will-change: transform` and `contain` too, all
	of which this library ships components built on. Left un-portalled, a
	`<ContextMenu>` nested inside any of those would measure this span's
	`getBoundingClientRect()` relative to that ancestor instead of the
	viewport — self-consistent, since `anchorPosition` reads whatever rect
	this span actually reports, but silently wrong: the panel opens away
	from the pointer coordinates `clientX`/`clientY` actually reported.
	Portalling to `document.body` guarantees the same containing block
	`clientX`/`clientY` are already relative to, regardless of what the
	consumer's own tree does around the trigger.
-->
<span
	bind:this={anchorRef}
	class="ft-context-menu-anchor"
	aria-hidden="true"
	use:portal
	style:position="fixed"
	style:left="{point.x}px"
	style:top="{point.y}px"
	style:width="0"
	style:height="0"
	style:pointer-events="none"
></span>
