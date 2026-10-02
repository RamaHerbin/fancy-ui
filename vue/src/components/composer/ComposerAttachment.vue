<script lang="ts">
import type { HTMLAttributes } from "vue";

import type { AttachmentData } from "../../internals/ai-types.js";

/**
 * Props for ComposerAttachment
 */
export interface ComposerAttachmentProps {
	/** The file to show: its name, and whatever the upload knows so far. */
	attachment: AttachmentData;
	/** Called with the attachment id instead of the composer's own removal. */
	onRemove?: (id: string) => void;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, inject } from "vue";

import { cn } from "../../utils.js";
import { useSoundCue } from "../../sound/use-sound.js";
import { COMPOSER_CONTEXT_KEY, type ComposerContext } from "./types.js";

defineOptions({ name: "ComposerAttachment", inheritAttrs: false });

const { attachment, onRemove, class: className } = defineProps<ComposerAttachmentProps>();

/**
 * Powers of 1024, stopping at megabytes: a chip is not where gigabytes belong,
 * and a four-digit megabyte count still reads faster than a unit nobody
 * expects next to a file name.
 */
const UNITS = ["B", "KB", "MB"] as const;

// Undefined when the chip is used outside a Composer: it then relies on
// `onRemove` alone, and goes inert without one rather than throwing.
const composer = inject<ComposerContext | undefined>(COMPOSER_CONTEXT_KEY, undefined);

// A no-op while the composer is silent, and the preference is read inside the
// returned function rather than in a render path.
const playCue = useSoundCue(() => composer?.sound);

const status = computed(() => attachment.status);
const uploading = computed(() => status.value === "uploading");
const failed = computed(() => status.value === "error");
// Out-of-range progress is a consumer bug, not a reason to paint a bar past
// the end of the chip.
const percent = computed(() =>
	Math.round(Math.min(1, Math.max(0, attachment.progress ?? 0)) * 100)
);
const size = computed(() => formatSize(attachment.size));
const removeLabel = computed(() => `Remove ${attachment.name}`);

// A remove button with nothing to call is a lie, and so is a live one inside a
// composer that has been switched off.
const removable = computed(() => onRemove !== undefined || composer !== undefined);
const removeDisabled = computed(() => !removable.value || (composer?.disabled ?? false));

/** Bytes as a chip-sized caption. Anything unmeasurable prints nothing at all. */
function formatSize(bytes: number | undefined): string {
	if (bytes === undefined || !Number.isFinite(bytes) || bytes < 0) return "";
	let scaled = bytes;
	let unit = 0;
	while (scaled >= 1024 && unit < UNITS.length - 1) {
		scaled /= 1024;
		unit += 1;
	}
	// Bytes are whole things; the scaled units keep one decimal, and a trailing
	// `.0` is noise at this size.
	const rounded = unit === 0 ? Math.round(scaled) : Math.round(scaled * 10) / 10;
	return `${rounded} ${UNITS[unit]}`;
}

function remove() {
	// The native `disabled` attribute already blocks a real click, but a
	// synthetic dispatch — in a test, or from any other caller — walks
	// straight past it, so the handler guards again rather than trusting the
	// attribute alone (see Button's `handleClick`).
	if (removeDisabled.value) return;
	playCue("press");
	// The prop wins outright: a consumer that passes one is running its own
	// upload bookkeeping and will drop the entry itself.
	if (onRemove) {
		onRemove(attachment.id);
		return;
	}
	composer?.removeAttachment(attachment.id);
}
</script>

<template>
	<div
		:class="[
			cn(
				'ft-composer-attachment relative flex max-w-full min-w-0 items-center gap-1.5 py-1 pr-1 pl-1.5 text-xs',
				className
			),
			{ 'ft-failed': failed },
		]"
		:data-status="status"
		:aria-busy="uploading ? 'true' : undefined"
	>
		<!-- Decorative: the file name sits right beside it and says the same thing. -->
		<img
			v-if="attachment.previewUrl"
			class="ft-composer-attachment-thumb size-5 shrink-0 rounded object-cover"
			:src="attachment.previewUrl"
			alt=""
		/>
		<svg
			v-else
			class="size-3.5 shrink-0"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.75"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z" />
			<path d="M14 2v6h6" />
		</svg>

		<span class="ft-composer-attachment-name max-w-32 truncate" :title="attachment.name">{{
			attachment.name
		}}</span>

		<span
			v-if="size"
			class="ft-composer-attachment-size text-foreground/70 shrink-0 tabular-nums"
			>{{ size }}</span
		>

		<!-- The tint is the only other thing that says so, and it says it to no one. -->
		<span v-if="failed" class="sr-only">Upload failed</span>

		<button
			type="button"
			class="ft-composer-attachment-remove hover:bg-muted focus-visible:ring-ring inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
			:disabled="removeDisabled"
			:aria-label="removeLabel"
			:title="removeLabel"
			@click="remove"
		>
			<svg
				class="size-3"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="M18 6 6 18" />
				<path d="m6 6 12 12" />
			</svg>
		</button>

		<span
			v-if="uploading"
			class="ft-composer-attachment-track"
			role="progressbar"
			:aria-label="`Uploading ${attachment.name}`"
			aria-valuemin="0"
			aria-valuemax="100"
			:aria-valuenow="percent"
		>
			<span class="ft-composer-attachment-bar" :style="{ width: `${percent}%` }"></span>
		</span>
	</div>
</template>

<style scoped>
.ft-composer-attachment {
	border-radius: var(--ft-composer-attachment-radius, 0.5rem);
	border: 1px solid
		var(--ft-composer-attachment-border, color-mix(in oklab, currentColor 14%, transparent));
	background: var(--ft-composer-attachment-bg, color-mix(in oklab, currentColor 5%, transparent));
}

/*
 * The failed chip is read at the point of use through two hooks: the
 * component's own `--ft-composer-attachment-error`, then the `--ft-status-*`
 * vocabulary the whole AI family shares, then the literal. Setting either
 * anywhere up the tree retints it without a specificity fight, and the shared
 * one recolours every failure in the family at once.
 */
.ft-composer-attachment.ft-failed {
	--ft-attachment-failed: var(
		--ft-composer-attachment-error,
		var(--ft-status-error, light-dark(oklch(0.5 0.19 25), oklch(0.7 0.18 25)))
	);
	border-color: color-mix(in oklab, var(--ft-attachment-failed) 45%, transparent);
	background: color-mix(in oklab, var(--ft-attachment-failed) 10%, transparent);
	color: var(--ft-attachment-failed);
}

/* Pinned to the chip's own bottom edge: the upload belongs to this file, and
   the row it sits in must not grow a line while the bar is up. */
.ft-composer-attachment-track {
	position: absolute;
	right: 0.25rem;
	bottom: 0.1875rem;
	left: 0.25rem;
	display: block;
	height: var(--ft-composer-attachment-track-height, 2px);
	overflow: hidden;
	border-radius: 9999px;
	background: var(
		--ft-composer-attachment-track,
		color-mix(in oklab, currentColor 15%, transparent)
	);
}

.ft-composer-attachment-bar {
	display: block;
	height: 100%;
	border-radius: inherit;
	background: var(
		--ft-composer-attachment-progress,
		var(--ft-status-running, light-dark(oklch(0.5 0.18 265), oklch(0.72 0.15 265)))
	);
}

/*
 * The only thing that moves is the bar catching up to its width. With this
 * rule gone it simply lands there, which is the same information without the
 * travel — nothing here needs a reduced-motion counterpart.
 */
@media (prefers-reduced-motion: no-preference) {
	.ft-composer-attachment-bar {
		transition: width var(--ft-composer-attachment-fill-duration, 220ms)
			cubic-bezier(0.4, 0, 0.2, 1);
	}
}
</style>
