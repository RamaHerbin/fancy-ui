<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface RainbowButtonProps {
	/** Animation speed in seconds */
	speed?: number;
	/** Custom CSS class */
	class?: HTMLAttributes["class"];
	/** Render as anchor element */
	href?: string;
	/** Native button type (ignored when `href` is set) */
	type?: "button" | "submit" | "reset";
	/** Disables the button / marks the link aria-disabled */
	disabled?: boolean;
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}
</script>

<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import { useSoundCue } from "../../sound/index.js";

defineOptions({ name: "RainbowButton", inheritAttrs: false });

// `disabled: undefined` is load-bearing, not noise: a `boolean` prop compiles
// to `type: Boolean`, and Vue casts an ABSENT boolean prop to `false` unless
// the prop declares a default. Without it, `:aria-disabled="disabled"` below
// would write `aria-disabled="false"` on every enabled anchor, where the
// Svelte source emits no attribute at all.
const props = withDefaults(defineProps<RainbowButtonProps>(), {
	speed: 2,
	href: undefined,
	type: "button",
	disabled: undefined,
	sound: false,
});

defineSlots<{ default?: () => unknown }>();

const el = useTemplateRef<HTMLButtonElement | HTMLAnchorElement>("el");
defineExpose({ ref: el });

const playCue = useSoundCue(() => props.sound);

const speedStyle = computed(() => ({ "--rainbow-speed": `${props.speed}s` }));

// No attrs fallthrough exists on this component (see the Svelte source's
// Implementation notes: there is no `...restProps` spread), so there is no
// consumer `onclick` to forward — the handler only ever plays the cue, and is
// bound identically on both the anchor and button render branches.
//
// Upstream fix: an anchor has no native `disabled`, and `aria-disabled` /
// `tabindex="-1"` do not stop a pointer click from following `href`, so the
// disabled path cancels the default navigation (the Svelte source only
// returns early).
function handleClick(event: MouseEvent) {
	if (props.disabled) {
		event.preventDefault();
		return;
	}
	playCue("press");
}

const baseClasses = computed(() =>
	cn(
		"rainbow-button",
		"group relative inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border-0 bg-[length:200%] px-8 py-2 font-medium transition-colors [background-clip:padding-box,border-box,border-box] [background-origin:border-box] [border:calc(0.08*1rem)_solid_transparent] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
		// Glow effect
		"before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--rainbow-1),var(--rainbow-5),var(--rainbow-3),var(--rainbow-4),var(--rainbow-2))] before:bg-[length:200%] before:[filter:blur(calc(0.8*1rem))]",
		// Light mode: dark button with light text
		"text-white bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--rainbow-1),var(--rainbow-5),var(--rainbow-3),var(--rainbow-4),var(--rainbow-2))]",
		// Dark mode: light button with dark text
		"dark:text-black dark:bg-[linear-gradient(#fff,#fff),linear-gradient(#fff_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--rainbow-1),var(--rainbow-5),var(--rainbow-3),var(--rainbow-4),var(--rainbow-2))]",
		props.class
	)
);
</script>

<template>
	<a
		v-if="href"
		ref="el"
		:class="baseClasses"
		:style="speedStyle"
		:href="href"
		:aria-disabled="disabled"
		:role="disabled ? 'link' : undefined"
		:tabindex="disabled ? -1 : undefined"
		@click="handleClick"
	>
		<span class="rainbow-button__glow" aria-hidden="true"><span></span></span>
		<span class="rainbow-button__beam" aria-hidden="true"></span>
		<slot />
	</a>
	<button
		v-else
		ref="el"
		:class="baseClasses"
		:style="speedStyle"
		:type="type"
		:disabled="disabled"
		@click="handleClick"
	>
		<span class="rainbow-button__glow" aria-hidden="true"><span></span></span>
		<span class="rainbow-button__beam" aria-hidden="true"></span>
		<slot />
	</button>
</template>

<style scoped>
.rainbow-button {
	--rainbow-1: hsl(0 100% 63%);
	--rainbow-2: hsl(270 100% 63%);
	--rainbow-3: hsl(210 100% 63%);
	--rainbow-4: hsl(195 100% 63%);
	--rainbow-5: hsl(90 100% 63%);
}

.rainbow-button::before {
	animation: rainbow var(--rainbow-speed, 2s) infinite linear;
}

/*
 * Hover beam: a rainbow light that rides the border. One conic gradient,
 * turned through a registered angle, drawn twice — masked to the border ring
 * (the beam itself) and blurred around the button (its halo).
 */
@property --beam-angle {
	syntax: "<angle>";
	inherits: true;
	initial-value: 0deg;
}

.rainbow-button {
	--beam-width: 1.5px;
	--glow-reach: 6px;
	--glow-blur: 10px;
	--beam: conic-gradient(
		from var(--beam-angle),
		transparent 0%,
		var(--rainbow-4) 5%,
		var(--rainbow-3) 10%,
		var(--rainbow-2) 15%,
		var(--rainbow-1) 20%,
		hsl(35 100% 60%) 24%,
		transparent 31%,
		transparent 50%,
		var(--rainbow-5) 55%,
		var(--rainbow-4) 60%,
		var(--rainbow-3) 64%,
		transparent 71%
	);
}

.rainbow-button__beam,
.rainbow-button__glow {
	position: absolute;
	border-radius: inherit;
	pointer-events: none;
	opacity: 0;
	transition: opacity 0.35s ease;
}

/* keep only the padding ring: the element minus its content box */
.rainbow-button__beam,
.rainbow-button__glow > span {
	background: var(--beam);
	-webkit-mask:
		linear-gradient(#000 0 0) content-box,
		linear-gradient(#000 0 0);
	-webkit-mask-composite: xor;
	mask:
		linear-gradient(#000 0 0) content-box,
		linear-gradient(#000 0 0);
	mask-composite: exclude;
}

/* the beam itself, on the border */
.rainbow-button__beam {
	inset: calc(-1 * var(--beam-width));
	padding: var(--beam-width);
	z-index: 1;
}

/* its halo: a wider ring, blurred AFTER masking so both edges go soft */
.rainbow-button__glow {
	inset: 0;
	filter: blur(var(--glow-blur));
}

.rainbow-button__glow > span {
	position: absolute;
	inset: calc(-1 * var(--glow-reach));
	padding: var(--glow-reach);
	border-radius: calc(0.75rem + var(--glow-reach));
}

.rainbow-button:hover .rainbow-button__beam,
.rainbow-button:focus-visible .rainbow-button__beam {
	opacity: 1;
}

.rainbow-button:hover .rainbow-button__glow,
.rainbow-button:focus-visible .rainbow-button__glow {
	opacity: 0.6;
}

.rainbow-button:hover,
.rainbow-button:focus-visible {
	animation: beam-spin calc(var(--rainbow-speed, 2s) * 1.5) linear infinite;
}

@keyframes beam-spin {
	to {
		--beam-angle: 360deg;
	}
}

@media (prefers-reduced-motion: reduce) {
	.rainbow-button:hover,
	.rainbow-button:focus-visible {
		animation: none;
		--beam-angle: 200deg;
	}
}
</style>

<!--
  The keyframe and the global `.animate-rainbow` utility cannot live in the
  scoped block above: the scoped compiler renames every keyframe declared in a
  block and rewrites only the `animation:` references it finds in that SAME
  block, so the renamed keyframe would no longer resolve for consumers' markup
  carrying `.animate-rainbow` (the `before:animate-rainbow` utility on this
  component's own class list among them).
-->
<style>
@keyframes rainbow {
	0% {
		background-position: 0%;
	}
	100% {
		background-position: 200%;
	}
}

.animate-rainbow {
	animation: rainbow var(--rainbow-speed, 2s) infinite linear;
}
</style>
