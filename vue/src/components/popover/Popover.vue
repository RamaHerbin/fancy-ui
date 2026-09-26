<script lang="ts">
import type { HTMLAttributes } from "vue";

import type { Side, Align } from "../../internals/anchor-position.js";

export interface PopoverProps {
	/** Whether the panel is open. Two-way through `v-model:open`. */
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
	/** Additional CSS classes, merged onto the panel. */
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

import { useFancyId } from "../../internals/use-id.js";
import { useSoundCue } from "../../sound/use-sound.js";
import PopoverContent from "./PopoverContent.vue";
import { POPOVER_CONTEXT, type PopoverContext } from "./types.js";

defineOptions({ name: "Popover", inheritAttrs: false });

const {
	onOpenChange,
	side = "bottom",
	align = "center",
	offset = 8,
	dismissible = true,
	class: className,
	sound = false,
} = defineProps<PopoverProps>();

// The counterpart of the source's bindable `open`: writable from inside, kept
// in step with a caller driving it from outside, and free to move on its own
// when nobody is listening. That is what makes all three documented call
// shapes work off one implementation — a caller two-way binding `open`, a
// caller who passes only `onOpenChange`, and a caller who passes a plain
// unbound value alongside it.
const open = defineModel<boolean>("open", { default: false });

defineSlots<{
	/**
	 * The trigger's content. Rendered inside the real `<button>` this
	 * component owns — keep it to text/icons, not another interactive
	 * control, or activation ends up on two nested buttons at once.
	 */
	trigger?: () => unknown;
	/** The panel's content. */
	default?: () => unknown;
}>();

// The trigger's `aria-controls` target. The panel isn't mounted at all until
// `open` is true, so the attribute itself is gated on `open` too (see the
// button below) — otherwise it would reference this id for the entire closed
// lifetime of the component, which is most of it, with nothing in the DOM
// behind it. `useFancyId()`, not `uid()`, because it needs to agree with
// itself from the first server-rendered paint, not just after hydration
// (convention C-6).
const contentId = useFancyId();

const triggerRef = useTemplateRef<HTMLButtonElement>("triggerRef");

// The PANEL element, published on the instance rather than through a prop:
// `ref` is a reserved vnode key in Vue (convention C-4). Read through the
// content component's own exposed `ref`, so it tracks the panel across a
// mount, an exit and a reopen mid-fade.
const content = useTemplateRef<InstanceType<typeof PopoverContent>>("content");
defineExpose({ ref: computed(() => content.value?.ref ?? null) });

// A no-op while `sound` is false, so the call site below stays unguarded, and
// the preference is read inside the returned function rather than in a render
// path.
const playCue = useSoundCue(() => sound);

// The one place `open` changes. A plain function, not a watcher — writing
// `open` there would mean reading and writing the same state in one pass, and
// would fight a caller's own two-way write.
function setOpen(next: boolean) {
	// A dismiss that changes nothing fires nothing: a second Escape racing the
	// exit must not call `onOpenChange(false)` a second time, nor double the
	// close cue.
	if (open.value === next) return;
	open.value = next;
	playCue(next ? "open" : "close");
	onOpenChange?.(next);
}

function toggle() {
	setOpen(!open.value);
}

function close() {
	setOpen(false);
}

// The source's getter object, verbatim in shape and built once in `setup`
// (convention C-3): each getter reads a live source, so a consumer's own
// `computed` picks the dependency up exactly as the source's `$derived` did.
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
		return triggerRef.value;
	},
	get open() {
		return open.value;
	},
	close,
};
POPOVER_CONTEXT.provide(context);
</script>

<template>
	<button
		ref="triggerRef"
		type="button"
		class="ft-popover-trigger border-border text-foreground hover:bg-accent hover:text-accent-foreground inline-flex cursor-pointer items-center gap-1.5 rounded-[8px] border px-[14px] py-[7px] text-[12px] font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--ft-overlay-accent)]/35 focus-visible:outline-none"
		:aria-expanded="open"
		:aria-controls="open ? contentId : undefined"
		@click="toggle"
	>
		<slot name="trigger" />
	</button>
	<!--
		Rendered unconditionally where the source wraps it in `{#if open}`. The
		panel owns its own mount clock, which is what keeps it on screen for the
		length of its exit — the job the source's branch-plus-outro did — and it
		is also why `open` has to reach it through the context.
	-->
	<PopoverContent ref="content" :class="className">
		<slot />
	</PopoverContent>
</template>

<style scoped>
.ft-popover-trigger {
	--ft-overlay-accent: var(
		--ft-accent,
		light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
	);
}
</style>
