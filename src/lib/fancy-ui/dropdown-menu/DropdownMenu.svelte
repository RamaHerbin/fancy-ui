<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { Side, Align } from "../_internals/anchor-position.js";

	export interface DropdownMenuProps {
		/** Whether the menu is open. Bindable. */
		open?: boolean;
		/** Called with the new value whenever the menu opens or closes, however the change happened. */
		onOpenChange?: (open: boolean) => void;
		/** Side of the trigger to place the menu on. */
		side?: Side;
		/** Alignment along the trigger's cross axis. */
		align?: Align;
		/** Gap in pixels between the trigger and the menu. */
		offset?: number;
		/** Whether arrow-key navigation wraps at the ends. */
		loop?: boolean;
		/** The `DropdownMenuTrigger` and `DropdownMenuContent`. */
		children?: Snippet;
	}
</script>

<script lang="ts">
	import { setContext } from "svelte";
	import { DROPDOWN_MENU_KEY, type DropdownMenuRootContext } from "./types.js";

	let {
		open = $bindable(false),
		onOpenChange,
		side = "bottom",
		align = "start",
		offset = 4,
		loop = true,
		children,
	}: DropdownMenuProps = $props();

	// `$props.id()`, not `_internals/id.js`'s `uid()` — the trigger renders
	// its own id unconditionally (not gated on `open`), so it has to agree
	// with itself from the first server-rendered paint, the same reasoning
	// as `Popover`'s `contentId` and `Select`'s `panelId`.
	const uid = $props.id();
	const contentId = `${uid}-content`;
	const triggerId = `${uid}-trigger`;

	let triggerRef: HTMLElement | null = null;
	let focusEdge: "first" | "last" = "first";

	// The one place `open` changes, in either direction — a plain function,
	// not an `$effect`, so it never reads and writes `open` in the same
	// reactive pass and never fights a caller's own `bind:open` write. Not
	// modal (no `focusTrap`), so returning focus to the trigger on close is
	// this component's own job, done here rather than left to a shared
	// primitive — see the README for why Escape and an outside click (both
	// routed through the same `dismissable` callback, on purpose — a second
	// Escape listener is exactly what a previous wave had to remove) both
	// take this path by default, and why Tab does not.
	function setOpen(next: boolean, options: { returnFocus?: boolean } = {}): void {
		if (open === next) return;
		open = next;
		onOpenChange?.(next);
		// `triggerRef?.isConnected` is checked explicitly, not left to
		// `.focus()`'s own silent no-op on a detached element (which would
		// behave identically either way) — stating the intent in code, the
		// same idiom `ContextMenu`'s `previouslyFocused?.isConnected` and
		// `_internals/focus-trap.ts` both use. There is no fallback target
		// beyond this: unlike a modal, a menu has nothing defensible to fall
		// back to, so a consumer who removes the trigger from the DOM while
		// its menu is open — an unusual thing to do — gets focus left
		// wherever the browser puts it once the active element disappears
		// (typically `<body>`), not a guess at somewhere better. Documented
		// in the README rather than left for a consumer to discover.
		if (!next && (options.returnFocus ?? true) && triggerRef?.isConnected) {
			triggerRef.focus();
		}
	}

	function openWithFocus(edge: "first" | "last"): void {
		focusEdge = edge;
		setOpen(true);
	}

	function close(options: { returnFocus?: boolean } = {}): void {
		setOpen(false, options);
	}

	const context: DropdownMenuRootContext = {
		get contentId() {
			return contentId;
		},
		get triggerId() {
			return triggerId;
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
		get focusEdge() {
			return focusEdge;
		},
		get triggerRef() {
			return triggerRef;
		},
		setTriggerRef(el) {
			triggerRef = el;
		},
		openWithFocus,
		close,
	};
	setContext(DROPDOWN_MENU_KEY, context);
</script>

{@render children?.()}
