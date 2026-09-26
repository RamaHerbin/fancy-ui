<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface AlertDialogProps {
	/** Whether the alert dialog is open. Two-way through `v-model:open`. */
	open?: boolean;
	/** Fires whenever `open` changes — Confirm, Cancel, or Escape. */
	onOpenChange?: (open: boolean) => void;
	/** The heading. Omitted entirely (not just visually) when not given, so `aria-labelledby` never points at nothing. */
	title?: string;
	/** The warning copy under the title. Same omission rule as `title`. */
	description?: string;
	/** Label of the destructive action. */
	confirmLabel?: string;
	/** Label of the safe action. */
	cancelLabel?: string;
	/** Called when the destructive action is activated, before the surface closes. */
	onConfirm?: () => void;
	/**
	 * Called when the safe action is activated, before the surface closes —
	 * and also when Escape closes the surface, since Escape is treated as
	 * the keyboard equivalent of Cancel here. See the README for why.
	 */
	onCancel?: () => void;
	/** Element to focus once the surface opens. Defaults to the Cancel button — see the README. */
	initialFocus?: HTMLElement | null;
	/** Additional classes for the panel. */
	class?: HTMLAttributes["class"];
	/**
	 * Plays the matching open/select/close cue through the sound controller.
	 * Off by default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}
</script>

<script setup lang="ts">
import { computed, useTemplateRef } from "vue";

import { cn } from "../../utils.js";
import { useFancyId } from "../../internals/use-id.js";
import { useSoundCue } from "../../sound/use-sound.js";
import Button from "../button/Button.vue";
import DialogSurface from "../dialog/DialogSurface.vue";

defineOptions({ name: "AlertDialog", inheritAttrs: false });

const {
	onOpenChange,
	title,
	description,
	confirmLabel = "Confirm",
	cancelLabel = "Cancel",
	onConfirm,
	onCancel,
	initialFocus = null,
	class: className,
	sound = false,
} = defineProps<AlertDialogProps>();

// The counterpart of the source's bindable `open` — see Dialog's identical
// model for why one implementation serves a caller two-way binding `open`, a
// caller who passes only `onOpenChange`, and a caller who passes neither and
// lets the trigger run the whole thing.
const open = defineModel<boolean>("open", { default: false });

defineSlots<{
	/** Optional trigger; renders in place and opens the surface on activation. */
	trigger?: () => unknown;
}>();

// A no-op while `sound` is false, so the call sites below stay unguarded, and
// the preference is read inside the returned function rather than in a render
// path.
const playCue = useSoundCue(() => sound);

// Same guard, and the same reason, as Dialog's own `setOpen`: a dismiss
// that changes nothing fires nothing, so a second Escape during the close
// cannot fire `onOpenChange` — or, through `handleCancel` below,
// `onCancel` — a second time.
function setOpen(next: boolean) {
	if (open.value === next) return;
	open.value = next;
	onOpenChange?.(next);
}

// Also doubles as `DialogSurface`'s `fallbackFocus` target below — see
// Dialog.vue's identical field for why.
const triggerRef = useTemplateRef<HTMLElement>("triggerRef");

function openFromTrigger() {
	if (open.value) return;
	playCue("open");
	setOpen(true);
}

// Escape's only path to closing this surface. Routing it through the
// exact same function the Cancel button calls is the point, not an
// implementation shortcut — see the README's "why is Escape wired to
// onCancel" note: a user who presses Escape on a destructive prompt
// meant to back out, the same thing clicking Cancel means, so both fire
// the same callback.
function handleCancel() {
	// Restates `setOpen`'s own dedupe locally: this function runs before
	// `setOpen`, so a second Escape/Cancel arriving while `open` is
	// already false (mid-exit) must not play a second `close`.
	if (open.value) playCue("close");
	onCancel?.();
	setOpen(false);
}

function handleConfirm() {
	// Commit-close is silent — `setOpen` below carries no cue of its own —
	// so `select` is the only sound a confirm ever plays.
	playCue("select");
	onConfirm?.();
	setOpen(false);
}

// The panel element, published on the instance rather than through a prop:
// `ref` is a reserved vnode key in Vue (convention C-4). Read through the
// surface's own exposed `ref`, so it tracks the panel across a mount, an exit
// and a reopen.
const surface = useTemplateRef<InstanceType<typeof DialogSurface>>("surface");
defineExpose({ ref: computed(() => surface.value?.ref ?? null) });

// Hoisted out of the template for the same load-bearing reason Dialog hoists
// its three: the dismiss layer is created by a watcher that also watches the
// options getter, so a callback spelled inline would be a fresh closure on
// every render, destroying the layer and pushing a new one — moving this
// surface back to the TOP of the shared stack and stealing Escape from an
// overlay opened above it.
const fallbackFocus = () => triggerRef.value;
const excludeTrigger = () => [triggerRef.value];

const uid = useFancyId();
const titleId = computed(() => (title ? `${uid}-title` : undefined));
const descriptionId = computed(() => (description ? `${uid}-description` : undefined));
</script>

<template>
	<!--
		See Dialog.vue's identical wrapper for why this has no ARIA role of its
		own: it only listens for the click bubbling up from whatever the
		`trigger` slot renders, which is expected to be a real interactive
		element carrying its own keyboard activation. `display: contents` keeps
		it out of layout entirely.
	-->
	<span v-if="$slots.trigger" ref="triggerRef" class="contents" @click="openFromTrigger">
		<slot name="trigger" />
	</span>
	<DialogSurface
		ref="surface"
		:open="open"
		role="alertdialog"
		:title-id="titleId"
		:description-id="descriptionId"
		:escape="true"
		:outside-click="false"
		:on-dismiss="handleCancel"
		:initial-focus="initialFocus"
		:fallback-focus="fallbackFocus"
		:exclude="excludeTrigger"
		:panel-class="cn('border-destructive/25', className)"
	>
		<div class="flex items-center gap-2">
			<span class="text-destructive" aria-hidden="true">⚠</span>
			<h2 v-if="title" :id="titleId" class="text-[15px] font-semibold text-balance">
				{{ title }}
			</h2>
		</div>
		<p
			v-if="description"
			:id="descriptionId"
			class="text-muted-foreground text-[12.5px] leading-relaxed"
		>
			{{ description }}
		</p>
		<div class="flex justify-end gap-2">
			<!--
				Cancel first in DOM order — on top of matching the mockup's own
				left-to-right layout, this is what makes it the focus trap's default
				focus target (the trap always focuses the first focusable descendant
				absent an explicit `initialFocus`), with no extra wiring needed to
				satisfy "cancel, not confirm, is focused first" for the common case
				of no override.

				Neither internal Button is ever handed `sound`: one activation must
				play exactly one cue, this component's own, not that plus a Button
				`press`.
			-->
			<Button variant="outline" size="sm" :onclick="handleCancel">{{ cancelLabel }}</Button>
			<Button variant="destructive" size="sm" :onclick="handleConfirm">{{ confirmLabel }}</Button>
		</div>
	</DialogSurface>
</template>
