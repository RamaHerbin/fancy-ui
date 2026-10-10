<script lang="ts">
import type { Side, Align } from "../../internals/anchor-position.js";

export interface ContextMenuProps {
	/** Whether the menu is open. Two-way through `v-model:open`. */
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
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}
</script>

<script setup lang="ts">
import { onMounted, ref, shallowRef } from "vue";

import Portal from "../../internals/Portal.vue";
import { composeRefs } from "../../internals/dom/compose-refs.js";
import { useFancyId } from "../../internals/use-id.js";
import { sound as soundFx } from "../../sound/sound.js";
import { CONTEXT_MENU_KEY, type ContextMenuRootContext, type MenuCloseOptions } from "./types.js";

/**
 * The root of the context-menu compound. Publishes the one context its
 * trigger and content read, and renders the zero-size virtual anchor the
 * panel positions itself against — exactly the two things the source does.
 *
 * No `defineExpose`: the source declares no `ref` binding here, and the
 * source's API surface is the contract, per-component.
 */
defineOptions({ name: "ContextMenu", inheritAttrs: false });

const {
	onOpenChange,
	side = "bottom",
	align = "start",
	offset = 2,
	loop = true,
	sound = false,
} = defineProps<ContextMenuProps>();

/** The `ContextMenuTrigger` and `ContextMenuContent`. */
defineSlots<{ default?: () => unknown }>();

// The counterpart of the source's bindable `open`: writable from inside, kept
// in step with a caller driving it from outside, and free to move on its own
// when nobody is listening.
const open = defineModel<boolean>("open", { default: false });

// `useFancyId()`, the counterpart of the source's `$props.id()`, not the
// handler-time `uid()`.
const contentId = useFancyId();

// A plain local, exactly as in the source — deliberately NOT reactive state
// there, and therefore not a `ref` here. Nothing renders off it: the content
// reads it lazily, from an anchor getter that runs at position time.
let anchorRef: HTMLElement | null = null;

const point = shallowRef<{ x: number; y: number }>({ x: 0, y: 0 });

// Captured the moment the menu opens, exactly the reasoning
// `internals/focus-trap.ts`'s own `previouslyFocused` uses for a modal
// surface — except this component isn't modal and can't reuse that
// module, so it borrows the pattern locally: remember what had focus,
// restore it on close if it's still around.
let previouslyFocused: HTMLElement | null = null;

function setAnchorRef(el: HTMLElement | null): void {
	anchorRef = el;
}

// Built ONCE in `setup`, so the span's ref is never detached and reattached
// just because this component re-rendered.
const anchorRefCallback = composeRefs<HTMLElement>(setAnchorRef);

// The source's `use:portal` is an ACTION, and an action never runs on the
// server: the span below is emitted INLINE in the component's own markup
// there, and only relocated to `document.body` once the client mounts. A
// `<Teleport>` is not an action — it renders server-side too — and this
// anchor is the one portalled node in the package that is NOT gated behind
// `v-if="presence.mounted"`, because it is kept mounted for the root's whole
// lifetime rather than only while the menu is open. Portalling it
// unconditionally would therefore emit a teleport payload for a CLOSED menu
// and break D-V6's "nothing is portalled server-side" invariant, which is
// what every hydration path in this package is written against.
//
// Staying `disabled` until `onMounted` reproduces the action exactly: inline
// on the server, inline through the hydration render (so the client's first
// pass matches the server's markup node for node), relocated the instant the
// client owns the tree. `onMounted` never runs on the server, so there is no
// branch here a server render can take.
const portalled = ref(false);
onMounted(() => {
	portalled.value = true;
});

// The one place `open` changes, in either direction — a plain function, not a
// watcher, so it never reads and writes `open` in the same reactive pass and
// never fights a caller's own `v-model:open` write.
function setOpen(next: boolean, options: MenuCloseOptions = {}): void {
	if (open.value === next) return;
	open.value = next;
	onOpenChange?.(next);
	// `silent` is what keeps one activation to exactly one cue: an item's own
	// `select` closes the whole menu, and this `close` would otherwise sound
	// on top of it.
	if (sound && !options.silent) soundFx.play(next ? "open" : "close");
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
	if (!open.value) previouslyFocused = document.activeElement as HTMLElement | null;
	point.value = { x, y };
	// The source also writes `left`/`top` onto the span imperatively here,
	// because its own render effect has not flushed yet at the moment the
	// panel's positioning recomputes off the same coordinate change. Here the
	// span's `:style` binding lands in the component-update pass and every
	// consumer of the resulting rect is a `flush: "post"` watcher, which runs
	// after it — so the rect is already correct by the time the positioner
	// asks, and there is nothing for a second, imperative write to fix.
	setOpen(true);
}

function close(options: MenuCloseOptions = {}): void {
	setOpen(false, options);
}

// The source's getter object, ported verbatim in shape (convention C-3) and
// built once in `setup`: every getter reads a live source, so a consumer's own
// `computed` tracks exactly what `$derived` tracked.
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
		return open.value;
	},
	get point() {
		return point.value;
	},
	get anchorRef() {
		return anchorRef;
	},
	get sound() {
		return sound;
	},
	setAnchorRef,
	openAt,
	close,
};
CONTEXT_MENU_KEY.provide(context);
</script>

<template>
	<slot />

	<!--
		The virtual anchor `useAnchorPosition` positions `ContextMenuContent`
		against: a zero-size, `position: fixed` point at the last-opened pointer
		coordinates. The anchor option needs a real element to call
		`getBoundingClientRect()` on — there is no DOM node at a right-click,
		so this one stands in for it. Kept mounted for this component's whole
		lifetime (not just while open) so it's already in place, positioned, and
		ready the instant `ContextMenuContent` asks for its rect.

		Portalled, same as `ContextMenuContent` itself: `position: fixed`
		resolves its containing block against the nearest ancestor that
		establishes one — not just `position`/`transform` on that ancestor, but
		`filter`, `perspective`, `will-change: transform` and `contain` too, all
		of which this library ships components built on. Left un-portalled, a
		`<ContextMenu>` nested inside any of those would measure this span's
		`getBoundingClientRect()` relative to that ancestor instead of the
		viewport — self-consistent, since the positioning core reads whatever
		rect this span actually reports, but silently wrong: the panel opens
		away from the pointer coordinates `clientX`/`clientY` actually
		reported. Portalling to `document.body` guarantees the same containing
		block `clientX`/`clientY` are already relative to, regardless of what
		the consumer's own tree does around the trigger.

		`:disabled` until `onMounted`: see `portalled` above. The source's
		portal is an action and does not run on the server, so this span is
		server-rendered INLINE, exactly as it is here.
	-->
	<Portal :disabled="!portalled">
		<span
			:ref="anchorRefCallback"
			class="ft-context-menu-anchor"
			aria-hidden="true"
			:style="{
				position: 'fixed',
				left: `${point.x}px`,
				top: `${point.y}px`,
				width: '0',
				height: '0',
				pointerEvents: 'none',
			}"
		></span>
	</Portal>
</template>
