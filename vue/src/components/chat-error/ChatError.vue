<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * Props for ChatError
 */
export interface ChatErrorProps {
	/** The failure line, e.g. "Something went wrong" */
	message?: string;
	/** Secondary muted line under the message, e.g. the error code */
	detail?: string;
	/** Called when the retry button is pressed. The button only exists when this is set. */
	onRetry?: () => void;
	/** Label for the retry button */
	retryLabel?: string;
	/** Whether a retry is in flight: disables the button and marks the row busy */
	retrying?: boolean;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
	/**
	 * Plays the press cue through the sound controller when retry is
	 * pressed. Off by default; only audible once the user has enabled
	 * sound.
	 */
	sound?: boolean;
}
</script>

<script setup lang="ts">
import { useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import { sound as soundFx } from "../../sound/sound.js";

defineOptions({ name: "ChatError", inheritAttrs: false });

const {
	message = "Something went wrong",
	detail,
	onRetry,
	retryLabel = "Retry",
	retrying = false,
	class: className,
	sound = false,
} = defineProps<ChatErrorProps>();

defineSlots<{
	icon?(): unknown;
	default?(): unknown;
}>();

const el = useTemplateRef<HTMLDivElement>("el");
defineExpose({ ref: el });

// Mirrors Button's own guard: `retrying` disables the button natively, but
// a synthetic click (or any dispatch that bypasses jsdom's disabled
// handling) walks straight past that, so the handler checks again before
// playing anything or calling out.
function handleRetry() {
	if (retrying) return;
	if (sound) soundFx.play("press");
	onRetry?.();
}
</script>

<template>
	<div
		ref="el"
		:class="
			cn(
				'ft-error flex w-full items-start gap-2.5 rounded-md border px-3 py-2 text-sm',
				className
			)
		"
		role="alert"
		:aria-busy="retrying ? 'true' : undefined"
	>
		<!--
			Decorative either way: the failure is carried by the message text, so the
			icon is hidden from assistive tech whether it is the default triangle or a
			caller's own slot.
		-->
		<span class="ft-error-icon mt-0.5 flex-none" aria-hidden="true">
			<slot name="icon">
				<svg
					class="size-4"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path
						d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
					/>
					<path d="M12 9v4" />
					<path d="M12 17h.01" />
				</svg>
			</slot>
		</span>

		<div class="ft-error-body min-w-0 flex-1">
			<slot>
				<p class="ft-error-message text-foreground">{{ message }}</p>
				<p v-if="detail" class="ft-error-detail text-foreground/70 mt-0.5 text-xs">
					{{ detail }}
				</p>
			</slot>
		</div>

		<button
			v-if="onRetry"
			type="button"
			class="ft-error-retry text-foreground/80 hover:text-foreground hover:bg-foreground/5 -my-0.5 flex flex-none items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-60"
			:disabled="retrying"
			@click="handleRetry"
		>
			<span v-if="retrying" class="ft-error-dot" aria-hidden="true"></span>
			{{ retryLabel }}
		</button>
	</div>
</template>

<style scoped>
/*
 * Every colour derives from `--ft-error-fg` at the point of use rather than
 * being redeclared on the root, so setting that one variable anywhere up the
 * tree — inline style, a theme class — retints the whole row without having
 * to win a specificity fight against these scoped rules. Unset, it falls
 * through to `--ft-status-error`, the failure colour this component family
 * shares, so a theme can speak once and be heard by all of them.
 */
.ft-error {
	background: var(
		--ft-error-bg,
		color-mix(
			in oklab,
			var(
					--ft-error-fg,
					var(--ft-status-error, light-dark(oklch(0.5 0.19 25), oklch(0.7 0.18 25)))
				)
				8%,
			transparent
		)
	);
	border-color: var(
		--ft-error-border,
		color-mix(
			in oklab,
			var(
					--ft-error-fg,
					var(--ft-status-error, light-dark(oklch(0.5 0.19 25), oklch(0.7 0.18 25)))
				)
				20%,
			transparent
		)
	);
}

.ft-error-icon {
	color: var(
		--ft-error-fg,
		var(--ft-status-error, light-dark(oklch(0.5 0.19 25), oklch(0.7 0.18 25)))
	);
}

.ft-error-dot {
	display: inline-block;
	flex: none;
	width: 0.375rem;
	height: 0.375rem;
	border-radius: 9999px;
	background: currentColor;
	opacity: 0.75;
}

/*
 * Both animations live behind `no-preference`, so reduced motion is not a
 * degraded variant to keep in sync: the row simply appears, and the dot stays
 * a plain dot that still marks the retry as in flight.
 */
@media (prefers-reduced-motion: no-preference) {
	.ft-error {
		animation: ft-error-in 220ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	.ft-error-dot {
		animation: ft-error-pulse 1.1s ease-in-out infinite;
	}
}

@keyframes ft-error-in {
	from {
		opacity: 0;
		transform: translateY(-2px);
	}
	to {
		opacity: 1;
		transform: none;
	}
}

@keyframes ft-error-pulse {
	0%,
	100% {
		opacity: 0.25;
	}
	50% {
		opacity: 0.9;
	}
}
</style>
