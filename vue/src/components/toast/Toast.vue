<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { ToastItem } from "./store.js";

export interface ToastProps {
	/** The toast to render. */
	item: ToastItem;
	/** Additional classes for the toast panel. */
	class?: HTMLAttributes["class"];
}

const VARIANT_ICON_CLASSES: Record<ToastItem["variant"], string> = {
	success: "ft-toast-icon--success",
	error: "ft-toast-icon--error",
	info: "ft-toast-icon--info",
	loading: "",
};
</script>

<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import { dismissToast, pauseToast, resumeToast } from "./store.js";

/**
 * One toast panel. Renders what the store hands it and wires the pause /
 * resume protocol; the entrance and exit animation belong to `<Toaster>`,
 * whose keyed list owns the per-item mount clock — the counterpart of the
 * source's two separate `in:`/`out:` directives on this same root element (a
 * toast has no `open` boolean: its existence IS its open state, so the mount
 * clock has to live with whatever renders the list).
 */
defineOptions({ name: "Toast", inheritAttrs: false });

const { item, class: className } = defineProps<ToastProps>();

const el = useTemplateRef<HTMLDivElement>("el");
defineExpose({ ref: el });

// Pause while *either* the pointer or focus is on the toast, and only
// resume once *both* have left. Two independent booleans instead of one
// shared flag: hovering with the mouse while also tabbing through the
// toast's buttons (or the reverse) must not resume the countdown just
// because one of the two let go first — `pauseToast`/`resumeToast` are
// idempotent, so re-pausing while still engaged is a harmless no-op.
// Plain locals, not reactive state: nothing in the markup reads them,
// exactly as the source keeps them non-reactive.
let hovering = false;
let focusedWithin = false;

function syncTimer() {
	if (hovering || focusedWithin) {
		pauseToast(item.id);
	} else {
		resumeToast(item.id);
	}
}

function handlePointerEnter() {
	hovering = true;
	syncTimer();
}

function handlePointerLeave() {
	hovering = false;
	syncTimer();
}

function handleFocusIn() {
	focusedWithin = true;
	syncTimer();
}

function handleFocusOut() {
	focusedWithin = false;
	syncTimer();
}

function handleAction() {
	item.action?.onClick();
}

function handleDismiss() {
	dismissToast(item.id);
}

const classes = computed(() =>
	cn(
		"ft-toast bg-popover text-popover-foreground border-border flex w-[300px] items-center gap-3 rounded-xl border p-3 shadow-[0_12px_32px_rgba(0,0,0,.5)]",
		item.variant === "error" && "border-destructive/30",
		className
	)
);

const iconClasses = computed(() =>
	cn("ft-toast-icon flex-none text-[14px]", VARIANT_ICON_CLASSES[item.variant])
);
</script>

<template>
	<div
		ref="el"
		:class="classes"
		data-state="open"
		:data-variant="item.variant"
		@pointerenter="handlePointerEnter"
		@pointerleave="handlePointerLeave"
		@focusin="handleFocusIn"
		@focusout="handleFocusOut"
	>
		<span :class="iconClasses" aria-hidden="true">
			<span v-if="item.variant === 'loading'" class="ft-toast-spinner"></span>
			<template v-else-if="item.variant === 'success'">✓</template>
			<template v-else-if="item.variant === 'error'">✕</template>
			<template v-else>ℹ</template>
		</span>

		<div class="flex flex-1 flex-col gap-0.5">
			<span class="text-[13px] font-medium">{{ item.title }}</span>
			<span v-if="item.description" class="text-muted-foreground text-[11px]">{{
				item.description
			}}</span>
		</div>

		<button
			v-if="item.action"
			type="button"
			class="ft-toast-action shrink-0 text-[12px] font-medium hover:underline"
			@click="handleAction"
		>
			{{ item.action.label }}
		</button>

		<button
			type="button"
			class="text-muted-foreground hover:text-foreground shrink-0 text-[12px] transition-colors"
			aria-label="Dismiss"
			@click="handleDismiss"
		>
			✕
		</button>
	</div>
</template>

<style scoped>
/*
 * Declared locally, once, from the shared consumer-facing `--ft-accent` —
 * the same indirection `Button` (`--ft-btn-accent`) and `Popover`
 * (`--ft-overlay-accent` itself) use, and for the same reason: the brand
 * accent has no semantic Tailwind token, so retinting it has to go
 * through a real custom property a consumer can set, not a value baked
 * into each rule below. Every other rule in this file just reads
 * `var(--ft-overlay-accent)` with no fallback of its own — the fallback
 * lives here, exactly once, so retinting only ever means overriding
 * `--ft-accent` and never chasing three separate literals.
 */
.ft-toast {
	--ft-overlay-accent: var(
		--ft-accent,
		light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
	);
}

.ft-toast-icon--success {
	color: var(--ft-status-done, light-dark(oklch(0.5 0.14 145), oklch(0.7729 0.1535 163.22)));
}

.ft-toast-icon--error {
	color: var(--ft-status-error, light-dark(oklch(0.577 0.245 27.325), oklch(0.704 0.191 22.216)));
}

.ft-toast-icon--info {
	color: var(--ft-overlay-accent);
}

.ft-toast-action {
	color: var(--ft-overlay-accent);
}

.ft-toast-spinner {
	display: inline-block;
	width: 14px;
	height: 14px;
	border-radius: 50%;
	border: 2px solid color-mix(in oklab, currentColor 20%, transparent);
	border-top-color: var(--ft-overlay-accent);
}

@media (prefers-reduced-motion: no-preference) {
	.ft-toast-spinner {
		animation: ft-toast-spin 0.8s linear infinite;
	}
}

@keyframes ft-toast-spin {
	to {
		transform: rotate(360deg);
	}
}
</style>
