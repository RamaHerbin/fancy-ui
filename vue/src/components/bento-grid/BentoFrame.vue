<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * Internal: the nested double frame both BentoGridItem and BentoGridCard
 * are drawn in. Not exported from index.ts — the two public tiles own
 * their content, this owns the chrome (outer hairline frame, inner lit
 * panel, the accent glow that rises from the bottom on hover, and the
 * bottom-edge light line).
 */
export interface BentoFrameProps {
	/** Classes for the outer frame (the grid item itself). */
	class?: HTMLAttributes["class"];
	/** Classes for the inner panel. */
	panelClass?: string;
}
</script>

<script setup lang="ts">
import { cn } from "../../utils.js";

defineOptions({ name: "BentoFrame", inheritAttrs: false });

const { class: className = "", panelClass = "" } = defineProps<BentoFrameProps>();

defineSlots<{
	default?: () => unknown;
}>();
</script>

<template>
	<div :class="cn('bento-tile relative flex rounded-2xl p-1.5', className)">
		<div
			:class="
				cn(
					'bento-panel relative isolate flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[10px]',
					panelClass
				)
			"
		>
			<span aria-hidden="true" class="bento-glow"></span>
			<span aria-hidden="true" class="bento-edge"></span>
			<slot v-if="$slots.default" />
		</div>
	</div>
</template>

<style scoped>
/*
 * Colour plumbing. `--_accent` reads the public `--bento-accent` (written
 * by BentoGrid's `accent` prop, or set by a consumer on any ancestor via
 * class) with a soft periwinkle fallback. `--_core` is the white-hot
 * centre of the glow, mixed from the accent.
 */
.bento-tile {
	--_accent: var(--bento-accent, #8e9cff);
	--_core: color-mix(in oklab, var(--_accent) 45%, white);
	--_frame-bg: var(--bento-frame-bg, #f6f6f7);
	--_frame-line: var(--bento-frame-line, rgba(0, 0, 0, 0.08));
	--_panel-bg: var(--bento-panel-bg, #fdfdfd);
	--_panel-line: var(--bento-panel-line, rgba(0, 0, 0, 0.07));
	--_panel-top: rgba(255, 255, 255, 0.95);
	--_panel-top-edge: rgba(255, 255, 255, 1);
	--_glow-peak: 0.3;

	background: var(--_frame-bg);
	border: 1px solid var(--_frame-line);
	box-shadow:
		0 1px 2px rgba(15, 15, 20, 0.04),
		0 12px 32px -18px rgba(15, 15, 20, 0.14);
	transition: border-color 300ms cubic-bezier(0.4, 0, 0.2, 1); /* EASINGS.inout */
}

/* The source's `:global(.dark) .bento-tile`, and every `:global(.dark)` rule
   below. Spelled without `:global()` here: the scoped compiler replaces a
   whole selector that contains `:global(...)` with the wrapped part alone (it
   would emit a bare `.dark`), while a plain ancestor class is left unscoped
   and only `.bento-tile` gets the attribute. */
.dark .bento-tile {
	--_frame-bg: var(--bento-frame-bg, #0f0f10);
	--_frame-line: var(--bento-frame-line, rgba(255, 255, 255, 0.08));
	--_panel-bg: var(--bento-panel-bg, #141416);
	--_panel-line: var(--bento-panel-line, rgba(255, 255, 255, 0.06));
	--_panel-top: rgba(255, 255, 255, 0.06);
	--_panel-top-edge: rgba(255, 255, 255, 0.08);
	--_glow-peak: 0.35;
	box-shadow:
		0 1px 2px rgba(0, 0, 0, 0.4),
		0 18px 40px -22px rgba(0, 0, 0, 0.7);
}

/* Inner panel: its own hairline plus a soft top light. */
.bento-panel {
	background: linear-gradient(180deg, var(--_panel-top), transparent 40%), var(--_panel-bg);
	border: 1px solid var(--_panel-line);
	box-shadow: inset 0 1px 0 var(--_panel-top-edge);
}

/* The glow: a blurred accent radial parked below the panel's bottom edge,
   white-hot at its centre. Hover raises it 40% → 0 and fades it in. */
.bento-glow {
	position: absolute;
	z-index: -1;
	left: -10%;
	right: -10%;
	bottom: -22%;
	height: 78%;
	pointer-events: none;
	background: radial-gradient(
		65% 85% at 50% 100%,
		var(--_core) 0%,
		var(--_accent) 30%,
		color-mix(in oklab, var(--_accent) 40%, transparent) 55%,
		transparent 80%
	);
	filter: blur(24px);
	opacity: 0;
	transform: translate3d(0, 40%, 0);
	transition:
		opacity 500ms cubic-bezier(0.4, 0, 0.2, 1),
		transform 700ms cubic-bezier(0.16, 1, 0.3, 1); /* EASINGS.out */
}

/* The bottom edge catches the light as the glow arrives. */
.bento-edge {
	position: absolute;
	left: 14%;
	right: 14%;
	bottom: 0;
	height: 1px;
	pointer-events: none;
	background: linear-gradient(
		90deg,
		transparent,
		var(--_accent) 25%,
		var(--_core) 50%,
		var(--_accent) 75%,
		transparent
	);
	opacity: 0;
	transition: opacity 500ms cubic-bezier(0.4, 0, 0.2, 1);
}

.bento-tile:hover,
.bento-tile:focus-within {
	--_frame-line: var(--bento-frame-line-hover, rgba(0, 0, 0, 0.12));
}
.dark .bento-tile:hover,
.dark .bento-tile:focus-within {
	--_frame-line: var(--bento-frame-line-hover, rgba(255, 255, 255, 0.13));
}

.bento-tile:hover .bento-glow,
.bento-tile:focus-within .bento-glow {
	opacity: var(--_glow-peak);
	transform: translate3d(0, 0, 0);
}
.bento-tile:hover .bento-edge,
.bento-tile:focus-within .bento-edge {
	opacity: 0.85;
}

/*
 * Shared content parts, styled here so Item and Card stay identical.
 * They live in the tiles' own markup (slot content), hence :deep under
 * .bento-tile.
 */

/* Content lift. */
.bento-tile :deep(.bento-lift) {
	transition: transform 500ms cubic-bezier(0.16, 1, 0.3, 1);
}

/* The icon sits in a small inset tile: darker well, inset hairline. */
.bento-tile :deep(.bento-icon) {
	display: grid;
	place-items: center;
	flex: none;
	border-radius: 10px;
	color: #71717a;
	background: #f0f0f2;
	border: 1px solid rgba(0, 0, 0, 0.07);
	box-shadow:
		inset 0 1px 2px rgba(0, 0, 0, 0.06),
		0 1px 0 rgba(255, 255, 255, 0.9);
	transition:
		color 300ms cubic-bezier(0.4, 0, 0.2, 1),
		border-color 300ms cubic-bezier(0.4, 0, 0.2, 1),
		background-color 300ms cubic-bezier(0.4, 0, 0.2, 1),
		box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1);
}
.dark .bento-tile :deep(.bento-icon) {
	color: #8a8a93;
	background: #0b0b0c;
	border-color: rgba(255, 255, 255, 0.07);
	box-shadow:
		inset 0 1px 3px rgba(0, 0, 0, 0.6),
		0 1px 0 rgba(255, 255, 255, 0.04);
}
.bento-tile:is(:hover, :focus-within) :deep(.bento-icon) {
	color: #18181b;
	background: #fff;
	border-color: color-mix(in oklab, var(--_accent) 45%, rgba(0, 0, 0, 0.08));
	box-shadow:
		inset 0 1px 2px rgba(0, 0, 0, 0.04),
		0 0 0 3px color-mix(in oklab, var(--_accent) 14%, transparent);
}
.dark .bento-tile:is(:hover, :focus-within) :deep(.bento-icon) {
	color: #fafafa;
	background: #19191c;
	border-color: color-mix(in oklab, var(--_accent) 40%, rgba(255, 255, 255, 0.1));
	box-shadow:
		inset 0 1px 0 rgba(255, 255, 255, 0.06),
		0 0 14px -4px color-mix(in oklab, var(--_accent) 55%, transparent);
}

/* The CTA slides in from the left and fades up. */
.bento-tile :deep(.bento-cta) {
	opacity: 0;
	transform: translate3d(-8px, 0, 0);
	transition:
		opacity 400ms cubic-bezier(0.4, 0, 0.2, 1),
		transform 500ms cubic-bezier(0.16, 1, 0.3, 1),
		color 300ms cubic-bezier(0.4, 0, 0.2, 1);
}
.bento-tile:is(:hover, :focus-within) :deep(.bento-cta) {
	opacity: 1;
	transform: translate3d(0, 0, 0);
}
/* No hover on touch screens: keep the CTA visible. */
@media (hover: none) {
	.bento-tile :deep(.bento-cta) {
		opacity: 1;
		transform: none;
	}
}

@media (prefers-reduced-motion: no-preference) {
	.bento-tile:is(:hover, :focus-within) :deep(.bento-lift) {
		transform: translate3d(0, -6px, 0);
	}
}

/* Reduced motion: the glow still arrives, but only as a fade — it sits
   in its final place from the start. */
@media (prefers-reduced-motion: reduce) {
	.bento-glow {
		transform: none;
		transition: opacity 300ms linear;
	}
	.bento-tile :deep(.bento-cta) {
		transform: none;
		transition: opacity 300ms linear;
	}
	.bento-tile :deep(.bento-lift) {
		transition: none;
	}
}
</style>
