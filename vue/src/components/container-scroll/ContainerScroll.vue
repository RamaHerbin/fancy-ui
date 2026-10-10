<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * ContainerScroll - a scroll-driven aperture
 *
 * The card starts shut: a slim horizontal slit with a bright seam of light
 * across its middle. As the section scrolls into view the slit opens
 * vertically to the full card, the seam splits into two lips that ride the
 * opening edges and fade, the content settles from a slight zoom into
 * focus, and the title above blurs away to hand the stage to the card.
 * No 3D tilt, no perspective.
 */
export interface ContainerScrollProps {
	/** Additional CSS classes on the section */
	class?: HTMLAttributes["class"];
	/** Seam colour (any CSS colour). Defaults to a soft blue. */
	accent?: string;
	/** Second seam tint, blended towards the seam ends. Defaults to a soft lilac. */
	accentSecondary?: string;
}

/**
 * Raw scroll progress of the card track, measured at its centre (where the
 * slit is): 0 while the slit is still in the bottom 8% of the viewport,
 * 1 once it has risen to just above the middle of the viewport.
 */
export function apertureProgress(top: number, height: number, viewport: number): number {
	if (viewport <= 0) return 1;
	const centre = top + height / 2;
	const p = (viewport * 0.92 - centre) / (viewport * 0.4);
	return p < 0 ? 0 : p > 1 ? 1 : p;
}

/** Smoothstep: a gentle start and a slow settle, so the opening reads as a lens, not a shutter. */
export function apertureEase(p: number): number {
	const t = p < 0 ? 0 : p > 1 ? 1 : p;
	return t * t * (3 - 2 * t);
}
</script>

<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { rafThrottle } from "../../internals/motion/raf.js";
import { useReducedMotion } from "../../internals/motion/use-media-query.js";

defineOptions({ name: "ContainerScroll", inheritAttrs: false });

const { class: className = "", accent, accentSecondary } = defineProps<ContainerScrollProps>();

defineSlots<{
	/** Title shown above the card (blurs and fades as the card opens) */
	titleContent?: () => unknown;
	/** Content revealed inside the card */
	cardContent?: () => unknown;
}>();

const reduced = useReducedMotion();

const track = useTemplateRef<HTMLDivElement>("track");
const raw = ref(0);

const progress = computed(() => (reduced.value ? 1 : raw.value));
const open = computed(() => apertureEase(progress.value));

const styleVars = computed(() => {
	const vars: Record<string, string> = {
		"--cs-progress": progress.value.toFixed(4),
		"--cs-open": open.value.toFixed(4),
	};
	if (accent) vars["--cs-accent"] = accent;
	if (accentSecondary) vars["--cs-accent-2"] = accentSecondary;
	return vars;
});

function measure() {
	const el = track.value;
	if (!el) return;
	const rect = el.getBoundingClientRect();
	raw.value = apertureProgress(rect.top, rect.height, window.innerHeight);
}

watch(
	() => [track.value, reduced.value] as const,
	([el, isReduced], _prev, onCleanup) => {
		if (!el || isReduced) return;
		const update = rafThrottle(measure);
		measure();
		// Capture phase so the card also tracks scrolling inside a nested
		// scroll container, not only the window.
		const opts = { capture: true, passive: true } as const;
		window.addEventListener("scroll", update, opts);
		window.addEventListener("resize", update, { passive: true });
		onCleanup(() => {
			update.cancel();
			window.removeEventListener("scroll", update, opts);
			window.removeEventListener("resize", update);
		});
	},
	{ flush: "post" }
);
</script>

<template>
	<div
		:class="
			cn(
				'cs-root relative flex h-[48rem] w-full items-start justify-center p-2 md:h-[64rem] md:p-10',
				className
			)
		"
		:style="styleVars"
		:data-reduced-motion="reduced ? '' : undefined"
	>
		<div class="relative w-full py-10 md:py-16">
			<!-- Title -->
			<div class="cs-title mx-auto max-w-5xl text-center">
				<slot name="titleContent" />
			</div>

			<!-- Card track (measured; never transformed) -->
			<div ref="track" class="cs-track relative mx-auto mt-10 w-full max-w-5xl md:mt-12">
				<div class="cs-stage relative aspect-[4/3] w-full sm:aspect-[16/10]">
					<!-- Ambient shadow: lives outside the clip so the aperture cannot cut it -->
					<div class="cs-shadow pointer-events-none absolute inset-0" aria-hidden="true"></div>

					<!-- Outer frame, clipped by the aperture -->
					<div class="cs-card absolute inset-0 p-1.5 md:p-2">
						<div class="cs-surface relative size-full overflow-hidden">
							<div class="cs-content size-full">
								<slot name="cardContent" />
							</div>
							<!-- Veil: the content emerges from shadow as light gets in -->
							<div class="cs-veil pointer-events-none absolute inset-0" aria-hidden="true"></div>
						</div>
					</div>

					<!-- Light: two lips riding the opening edges, and the seam at the centre -->
					<div class="cs-lip cs-lip-top pointer-events-none absolute" aria-hidden="true"></div>
					<div class="cs-lip cs-lip-bottom pointer-events-none absolute" aria-hidden="true"></div>
					<div class="cs-seam pointer-events-none absolute" aria-hidden="true">
						<span class="cs-seam-haze"></span>
						<span class="cs-seam-glow"></span>
						<span class="cs-seam-line"></span>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.cs-root {
	--_accent: var(--cs-accent, #8fb2ff);
	--_accent-2: var(--cs-accent-2, #c3b1ff);
	--_core: color-mix(in oklab, var(--_accent) 45%, white);
	--_radius: 22px;
	--_glow: 75%;
	--_frame: #f4f4f5;
	--_frame-line: rgba(0, 0, 0, 0.08);
	--_surface: #fafafa;
	--_surface-line: rgba(0, 0, 0, 0.07);
	--_shadow:
		0 1px 2px rgba(0, 0, 0, 0.04), 0 12px 28px -12px rgba(0, 0, 0, 0.12),
		0 40px 80px -40px rgba(0, 0, 0, 0.22);
	/* 1 → closed slit (48% top + 48% bottom), 0 → fully open */
	--_shut: calc(1 - var(--cs-open, 0));
}

/* The source's `:global(.dark) .cs-root`. Spelled without `:global()` here:
   the scoped compiler replaces a whole selector that contains `:global(...)`
   with the wrapped part alone, while a plain ancestor selector is left
   unscoped and only `.cs-root` gets the attribute. */
.dark .cs-root {
	--_glow: 60%;
	--_frame: #0f0f10;
	--_frame-line: rgba(255, 255, 255, 0.08);
	--_surface: #0b0b0c;
	--_surface-line: rgba(255, 255, 255, 0.07);
	--_shadow:
		0 1px 0 rgba(255, 255, 255, 0.03) inset, 0 20px 50px -24px rgba(0, 0, 0, 0.9),
		0 60px 120px -60px rgba(0, 0, 0, 0.8);
}

/* Title: hands the stage over by going out of focus */
.cs-title {
	/* starts only once the aperture is a quarter open */
	--_fade: clamp(0, (var(--cs-progress, 0) - 0.25) / 0.75, 1);
	opacity: calc(1 - var(--_fade) * 0.85);
	filter: blur(calc(var(--_fade) * 6px));
	transform: scale(calc(1 - var(--_fade) * 0.02));
	transform-origin: 50% 100%;
}

.cs-stage {
	transform: translateY(calc(var(--_shut) * 24px));
}

.cs-shadow {
	border-radius: var(--_radius);
	box-shadow: var(--_shadow);
	/* follows the opening so it never outlines the still-hidden card */
	transform: scaleY(calc(1 - var(--_shut) * 0.96));
	opacity: calc(var(--cs-open, 0) * var(--cs-open, 0));
}

.cs-card {
	border-radius: var(--_radius);
	background: var(--_frame);
	border: 1px solid var(--_frame-line);
	clip-path: inset(calc(var(--_shut) * 48%) 0 calc(var(--_shut) * 48%) 0 round var(--_radius));
}

.cs-surface {
	border-radius: calc(var(--_radius) - 7px);
	background: var(--_surface);
	box-shadow: 0 0 0 1px var(--_surface-line);
}

.cs-content {
	transform: scale(calc(1 + var(--_shut) * 0.08));
	transform-origin: 50% 50%;
}

/* ---- Light ---------------------------------------------------------- */

.cs-seam {
	left: 4%;
	right: 4%;
	top: 50%;
	height: 0;
	opacity: calc(1 - var(--cs-progress, 0) * 3);
}

.cs-seam-line,
.cs-seam-glow,
.cs-seam-haze {
	position: absolute;
	left: 0;
	right: 0;
	top: 0;
	border-radius: 999px;
}

.cs-seam-line {
	height: 1px;
	transform: translateY(-50%);
	background: linear-gradient(
		90deg,
		transparent,
		color-mix(in oklab, var(--_accent-2) 70%, transparent) 14%,
		var(--_accent) 34%,
		var(--_core) 50%,
		var(--_accent) 66%,
		color-mix(in oklab, var(--_accent-2) 70%, transparent) 86%,
		transparent
	);
	box-shadow: 0 0 6px 0 color-mix(in oklab, var(--_accent) 60%, transparent);
}

.cs-seam-glow {
	height: 28px;
	transform: translateY(-50%);
	background: radial-gradient(
		50% 50% at 50% 50%,
		color-mix(in oklab, var(--_accent) var(--_glow), transparent),
		color-mix(in oklab, var(--_accent-2) 25%, transparent) 60%,
		transparent 100%
	);
	filter: blur(10px);
}

/* a wide, faint horizon of light spilling past the slit */
.cs-seam-haze {
	left: -6%;
	right: -6%;
	height: 90px;
	transform: translateY(-50%);
	background: radial-gradient(
		50% 50% at 50% 50%,
		color-mix(in oklab, var(--_accent) calc(var(--_glow) * 0.45), transparent),
		transparent 70%
	);
	filter: blur(18px);
}

.cs-veil {
	background: var(--_surface);
	opacity: calc(var(--_shut) * var(--_shut) * 0.75);
}

.cs-lip {
	left: 3%;
	right: 3%;
	height: 1px;
	background: linear-gradient(
		90deg,
		transparent,
		color-mix(in oklab, var(--_accent-2) 55%, transparent) 20%,
		color-mix(in oklab, var(--_accent) 80%, white) 50%,
		color-mix(in oklab, var(--_accent-2) 55%, transparent) 80%,
		transparent
	);
	box-shadow: 0 0 10px 0 color-mix(in oklab, var(--_accent) 45%, transparent);
	opacity: var(--_shut);
}

.cs-lip-top {
	top: calc(var(--_shut) * 48%);
}

.cs-lip-bottom {
	bottom: calc(var(--_shut) * 48%);
}

/* Light theme: a white core vanishes on a pale page, so deepen the seam.
   The source's `:global(html:not(.dark)) .cs-root`, spelled as a plain
   ancestor selector for the same reason as the dark block above. */
html:not(.dark) .cs-root {
	--_core: color-mix(in oklab, var(--_accent) 75%, white);
}

/* Reduced motion: a still frame — card open, title sharp, no light */
.cs-root[data-reduced-motion] {
	--_shut: 0;
}
.cs-root[data-reduced-motion] .cs-title {
	opacity: 1;
	filter: none;
	transform: none;
}
.cs-root[data-reduced-motion] .cs-seam,
.cs-root[data-reduced-motion] .cs-lip {
	display: none;
}

@media (prefers-reduced-motion: reduce) {
	.cs-root {
		--_shut: 0;
	}
	.cs-title {
		opacity: 1;
		filter: none;
		transform: none;
	}
	.cs-seam,
	.cs-lip {
		display: none;
	}
	.cs-shadow {
		opacity: 1;
	}
}
</style>
