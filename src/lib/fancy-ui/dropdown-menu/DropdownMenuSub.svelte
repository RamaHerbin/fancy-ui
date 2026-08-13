<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface DropdownMenuSubProps {
		/** The `DropdownMenuSubTrigger` and `DropdownMenuSubContent`. */
		children?: Snippet;
	}
</script>

<script lang="ts">
	import { getContext, setContext } from "svelte";
	import type { Side } from "../_internals/anchor-position.js";
	import { MENU_KEY, SUB_KEY, type MenuContext, type SubContext } from "./types.js";

	let { children }: DropdownMenuSubProps = $props();

	// The *parent* level's context — captured before this component sets its
	// own `MENU_KEY` (which it doesn't: only `DropdownMenuSubContent` does,
	// scoped to its own subtree). This is what lets a selection deep inside
	// this submenu close the whole tree, and what lets opening this submenu
	// close a sibling one at the same level.
	const parentMenu = getContext<MenuContext>(MENU_KEY);

	const contentId = $props.id();

	let open = $state(false);
	let triggerRef: HTMLElement | null = null;
	let resolvedSide = $state<Side>("right");
	let closeTimer: ReturnType<typeof setTimeout> | null = null;
	let unregisterOpenSub: (() => void) | null = null;

	// Close-intent delay: leaving the trigger (or the content) starts this
	// timer rather than closing immediately, so a pointer travelling from
	// the trigger row into the submenu — necessarily crossing empty space
	// for an instant — doesn't flicker the submenu shut before it arrives.
	const CLOSE_INTENT_MS = 200;

	function clearCloseTimer(): void {
		if (closeTimer !== null) {
			clearTimeout(closeTimer);
			closeTimer = null;
		}
	}

	function openSub(): void {
		clearCloseTimer();
		if (open) return;
		if (triggerRef) parentMenu.closeSiblingSubs(triggerRef);
		open = true;
		if (triggerRef) {
			unregisterOpenSub = parentMenu.registerOpenSub(triggerRef, () => closeSub(false));
		}
	}

	function closeSub(returnFocus: boolean): void {
		clearCloseTimer();
		if (!open) return;
		open = false;
		unregisterOpenSub?.();
		unregisterOpenSub = null;
		if (returnFocus) triggerRef?.focus();
	}

	function keepOpen(): void {
		clearCloseTimer();
	}

	function scheduleClose(): void {
		clearCloseTimer();
		closeTimer = setTimeout(() => {
			closeTimer = null;
			closeSub(false);
		}, CLOSE_INTENT_MS);
	}

	// Cancels a pending close-intent timer, and releases this submenu's own
	// registration in the parent's open-sub registry, on destroy — not just
	// from the event handlers above. A keyed `{#each}` reordering can
	// destroy this exact `DropdownMenuSub` while the parent context and its
	// siblings stay alive; without this, a stale timer or a stale
	// `unregisterOpenSub` closure lingers referencing a component that's
	// already gone. Every call along that path already guards itself
	// against a detached/stale target, so this was never a crash — it's
	// hygiene, done anyway because there's no reason to leave either armed.
	$effect(() => {
		return () => {
			clearCloseTimer();
			unregisterOpenSub?.();
		};
	});

	const context: SubContext = {
		get open() {
			return open;
		},
		contentId,
		get triggerRef() {
			return triggerRef;
		},
		get resolvedSide() {
			return resolvedSide;
		},
		setTriggerRef(el) {
			triggerRef = el;
		},
		setResolvedSide(side) {
			resolvedSide = side;
		},
		openSub,
		closeSub,
		keepOpen,
		scheduleClose,
	};
	setContext(SUB_KEY, context);
</script>

{@render children?.()}
