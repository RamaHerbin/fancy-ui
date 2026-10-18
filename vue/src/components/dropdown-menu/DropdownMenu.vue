<script lang="ts">
import type { Side, Align } from "../../internals/anchor-position.js";

export interface DropdownMenuProps {
	/** Whether the menu is open. Two-way through `v-model:open`. */
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
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}
</script>

<script setup lang="ts">
import { useFancyId } from "../../internals/use-id.js";
import { sound as soundFx } from "../../sound/sound.js";
import { DROPDOWN_MENU_KEY, type DropdownMenuRootContext, type MenuCloseOptions } from "./types.js";

defineOptions({ name: "DropdownMenu", inheritAttrs: false });

const {
	onOpenChange,
	side = "bottom",
	align = "start",
	offset = 4,
	loop = true,
	sound = false,
} = defineProps<DropdownMenuProps>();

/** The `DropdownMenuTrigger` and `DropdownMenuContent`. */
defineSlots<{ default?: () => unknown }>();

// The counterpart of the source's bindable `open`: writable from inside, kept
// in step with a caller driving it from outside, and free to move on its own
// when nobody is listening.
const open = defineModel<boolean>("open", { default: false });

// `useFancyId()`, the counterpart of the source's `$props.id()`, not the
// handler-time `uid()` — the trigger renders its own id unconditionally (not
// gated on `open`), so it has to agree with itself from the first
// server-rendered paint, the same reasoning as `Select`'s `panelId`.
const uid = useFancyId();
const contentId = `${uid}-content`;
const triggerId = `${uid}-trigger`;

// Plain locals, exactly as in the source: nothing renders off either of them.
// The trigger element is resolved at event time (the anchor getter, the
// dismiss layer's `exclude`), and the focus edge is read once, inside the
// content's open handshake.
let triggerRef: HTMLElement | null = null;
let focusEdge: "first" | "last" = "first";

// The one place `open` changes, in either direction — a plain function, not a
// watcher, so it never reads and writes `open` in the same reactive pass and
// never fights a caller's own `v-model:open` write. Not modal (no focus
// trap), so returning focus to the trigger on close is this component's own
// job, done here rather than left to a shared primitive — see the README for
// why Escape and an outside click (both routed through the same dismiss
// callback, on purpose — a second Escape listener is exactly what a previous
// wave had to remove) both take this path by default, and why Tab does not.
function setOpen(next: boolean, options: MenuCloseOptions = {}): void {
	if (open.value === next) return;
	open.value = next;
	onOpenChange?.(next);
	if (sound && !options.silent) soundFx.play(next ? "open" : "close");
	// `triggerRef?.isConnected` is checked explicitly, not left to `.focus()`'s
	// own silent no-op on a detached element (which would behave identically
	// either way) — stating the intent in code. There is no fallback target
	// beyond this: unlike a modal, a menu has nothing defensible to fall back
	// to, so a consumer who removes the trigger from the DOM while its menu is
	// open — an unusual thing to do — gets focus left wherever the browser puts
	// it once the active element disappears (typically `<body>`), not a guess
	// at somewhere better. Documented in the README rather than left for a
	// consumer to discover.
	if (!next && (options.returnFocus ?? true) && triggerRef?.isConnected) {
		triggerRef.focus();
	}
}

function openWithFocus(edge: "first" | "last"): void {
	focusEdge = edge;
	setOpen(true);
}

function close(options: MenuCloseOptions = {}): void {
	setOpen(false, options);
}

// The source's getter object, ported verbatim in shape (convention C-3) and
// built once in `setup`: every getter reads a live source, so a consumer's own
// `computed` tracks exactly what `$derived` tracked.
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
		return open.value;
	},
	get focusEdge() {
		return focusEdge;
	},
	get triggerRef() {
		return triggerRef;
	},
	get sound() {
		return sound;
	},
	setTriggerRef(el) {
		triggerRef = el;
	},
	openWithFocus,
	close,
};
DROPDOWN_MENU_KEY.provide(context);
</script>

<template>
	<slot />
</template>
