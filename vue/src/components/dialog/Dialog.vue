<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface DialogProps {
	/** Whether the dialog is open. Two-way through `v-model:open`. */
	open?: boolean;
	/** Fires whenever `open` changes, from any trigger — the close button, Escape, an outside click, or the optional `trigger` slot. */
	onOpenChange?: (open: boolean) => void;
	/** The heading. Omitted entirely (not just visually) when not given, so `aria-labelledby` never points at nothing. */
	title?: string;
	/** The copy under the title. Same omission rule as `title`. */
	description?: string;
	/** Whether Escape and an outside click close the dialog. The close button always works regardless — see the README. */
	dismissible?: boolean;
	/** Element to focus once the dialog opens. Defaults to the first focusable descendant — often the close button; pass a form field here for dialogs built around one. */
	initialFocus?: HTMLElement | null;
	/** Additional classes for the panel. */
	class?: HTMLAttributes["class"];
	/**
	 * Plays the matching open/close cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}
</script>

<script setup lang="ts">
import { computed, useTemplateRef } from "vue";

import { cn } from "../../utils.js";
import { useFancyId } from "../../internals/use-id.js";
import { useSoundCue } from "../../sound/use-sound.js";
import DialogSurface from "./DialogSurface.vue";

defineOptions({ name: "Dialog", inheritAttrs: false });

const props = withDefaults(defineProps<DialogProps>(), {
	dismissible: true,
	initialFocus: null,
	sound: false,
});

// The counterpart of the source's bindable `open`: writable from inside, kept
// in step with a caller driving it from outside, and free to move on its own
// when nobody is listening. That is what makes all three documented call
// shapes work off one implementation — a caller two-way binding `open`, a
// caller who passes only `onOpenChange`, and a caller who passes neither and
// lets the trigger run the whole thing.
const open = defineModel<boolean>("open", { default: false });

defineSlots<{
	/** The dialog's body. */
	default?: () => unknown;
	/** The action row under the body. Free-form — callers build their own buttons. */
	footer?: () => unknown;
	/** Optional trigger; renders in place and opens the dialog on activation. */
	trigger?: () => unknown;
}>();

// A no-op while `sound` is false, so the call site below stays unguarded, and
// the preference is read inside the returned function rather than in a render
// path.
const playCue = useSoundCue(() => props.sound);

// The only place `open` changes on this side of the wire — a plain function,
// not a watcher, so it never fights a caller's own two-way write and never
// reads/writes `open` in the same pass.
function setOpen(next: boolean) {
	// A dismiss that changes nothing fires nothing. Belt and braces beside the
	// dismiss layer's own `active` gate — `active` stops the listener, this
	// stops the callback — and it fixes a real defect on its own: a second
	// Escape during the close used to fire `onOpenChange(false)` a second time.
	// The same early return is what keeps a two-way write bypassing this
	// function silent, on purpose — see the README's Sound section.
	if (open.value === next) return;
	open.value = next;
	playCue(next ? "open" : "close");
	props.onOpenChange?.(next);
}

// Nothing outside this file ever needs to read or set it. It only has to exist
// by the time the dismiss layer's `exclude` callback runs, and both that and
// `fallbackFocus` below are resolved at event time. Doubles as
// `DialogSurface`'s `fallbackFocus` target — a real, findable place for focus
// to land on close if whatever had focus when the dialog opened is no longer
// in the document by the time it closes.
const triggerRef = useTemplateRef<HTMLElement>("triggerRef");

// The panel element, published on the instance rather than through a prop:
// `ref` is a reserved vnode key in Vue (convention C-4). Read through the
// surface's own exposed `ref`, so it tracks the panel across a mount, an exit
// and a reopen.
const surface = useTemplateRef<InstanceType<typeof DialogSurface>>("surface");
defineExpose({ ref: computed(() => surface.value?.ref ?? null) });

// The wrapper only listens for the click bubbling up from whatever the caller
// put inside `trigger` — it adds no interactive semantics of its own, so the
// trigger's own content (expected to be a real button or similar) is what
// carries keyboard activation. `exclude` on `DialogSurface` below is what stops
// this same element from reading as an "outside" pointerdown once the dialog is
// open, so clicking the trigger again while open cannot immediately dismiss
// what it just — or is about to — open.
function openFromTrigger() {
	if (open.value) return;
	setOpen(true);
}

// Hoisted out of the template on purpose, and this is load-bearing rather than
// tidiness. The dismiss layer is created by a watcher whose source array holds
// the panel element sink; a shallow source makes that watcher fire on every
// dirty run, value change or not, and the options getter it also watches reads
// these three props. Spelled inline in the template they would be fresh
// closures on every render, so an unrelated re-render (a new `title`, say) would
// destroy the layer and push a new one — moving this dialog back to the TOP of
// the shared stack and stealing Escape from an overlay opened on top of it. The
// source cannot do that: its action is created once per element mount and a
// re-render only reaches `update()`, which mutates in place and never reorders
// the stack. Stable identities reproduce that exactly.
const handleDismiss = () => setOpen(false);
const fallbackFocus = () => triggerRef.value;
const excludeTrigger = () => [triggerRef.value];

// One seed, two suffixes — the same one-generator-per-instance pattern
// FormField and RadioGroup use, safe during SSR. Undefined rather than a
// generated id with nothing pointing at it while the title/description they'd
// label are not rendered.
const uid = useFancyId();
const titleId = computed(() => (props.title ? `${uid}-title` : undefined));
const descriptionId = computed(() => (props.description ? `${uid}-description` : undefined));
</script>

<template>
	<!--
		This wrapper adds no semantics of its own on purpose — it only listens for
		the click bubbling up from whatever the `trigger` slot renders, which is
		expected to be a real interactive element (a Button, typically) carrying
		its own keyboard activation. `display: contents` keeps it out of layout
		entirely, so it never affects how the trigger's own content positions
		itself.
	-->
	<span v-if="$slots.trigger" ref="triggerRef" class="contents" @click="openFromTrigger">
		<slot name="trigger" />
	</span>
	<DialogSurface
		ref="surface"
		:open="open"
		role="dialog"
		:title-id="titleId"
		:description-id="descriptionId"
		:escape="props.dismissible"
		:outside-click="props.dismissible"
		:on-dismiss="handleDismiss"
		:initial-focus="props.initialFocus"
		:fallback-focus="fallbackFocus"
		:exclude="excludeTrigger"
		:panel-class="cn(props.class)"
	>
		<div class="flex items-start justify-between gap-3">
			<h2 v-if="props.title" :id="titleId" class="text-[15px] font-semibold text-balance">
				{{ props.title }}
			</h2>
			<!--
				Always rendered and always functional, independent of `dismissible`:
				this is an explicit, deliberate activation — like clicking a Cancel
				button — not the accidental miss-click `dismissible` guards against, so
				a dialog that turns off Escape/outside-click to protect in-progress
				work still leaves one unambiguous way out.
			-->
			<button
				type="button"
				class="ft-dialog-close text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--ft-overlay-accent)]/35 focus-visible:outline-none"
				aria-label="Close"
				@click="setOpen(false)"
			>
				<span aria-hidden="true">✕</span>
			</button>
		</div>
		<p
			v-if="props.description"
			:id="descriptionId"
			class="text-muted-foreground text-[12.5px] leading-relaxed"
		>
			{{ props.description }}
		</p>
		<slot />
		<div v-if="$slots.footer" class="flex justify-end gap-2">
			<slot name="footer" />
		</div>
	</DialogSurface>
</template>
