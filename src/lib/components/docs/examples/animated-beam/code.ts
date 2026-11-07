import { attribute, type PlaygroundScalar } from "$lib/docs/playground-code.js";
import type { Framework } from "$lib/inspiration/types.js";

const DEFAULTS: Record<string, PlaygroundScalar> = {
	curvature: 0,
	reverse: false,
	pathWidth: 2,
	pulses: 1,
	tail: 0.35,
	glow: 0.6,
	delay: 0,
	gradientStartColor: "#ffaa40",
	gradientStopColor: "#9c40ff",
};

/**
 * The usage per framework: a beam is drawn between two elements inside a
 * container, so the export carries the three elements and the references the
 * beam reads (state in Svelte and Vue, refs in React). The duration has no
 * fixed default (it comes from the seed), so it is always written.
 */
export function animatedBeamCode(
	values: Record<string, PlaygroundScalar>,
	framework: Framework
): string {
	const attrs: string[] = [];
	for (const [name, fallback] of Object.entries(DEFAULTS)) {
		const value = values[name];
		if (value === undefined) continue;
		const same =
			typeof value === "string" && typeof fallback === "string"
				? value.toLowerCase() === fallback.toLowerCase()
				: value === fallback;
		if (!same) attrs.push(attribute(name, value, framework));
	}
	if (typeof values.duration === "number")
		attrs.push(attribute("duration", values.duration, framework));
	const rest = (depth: number) => attrs.map((a) => `\n${"\t".repeat(depth)}${a}`).join("");

	const host =
		"relative flex h-48 items-center justify-between overflow-hidden rounded-xl border px-10";
	const node = "flex size-12 items-center justify-center rounded-xl border bg-white";

	if (framework === "react") {
		return `const containerRef = useRef<HTMLDivElement>(null);
const fromRef = useRef<HTMLDivElement>(null);
const toRef = useRef<HTMLDivElement>(null);

<div ref={containerRef} className="${host}">
	<div ref={fromRef} className="${node}">From</div>
	<div ref={toRef} className="${node}">To</div>
	<AnimatedBeam
		containerRef={containerRef}
		fromRef={fromRef}
		toRef={toRef}${rest(2)}
	/>
</div>`;
	}
	if (framework === "vue") {
		return `<script setup lang="ts">
import { ref } from "vue";

const container = ref<HTMLElement | null>(null);
const from = ref<HTMLElement | null>(null);
const to = ref<HTMLElement | null>(null);
</script>

<div ref="container" class="${host}">
	<div ref="from" class="${node}">From</div>
	<div ref="to" class="${node}">To</div>
	<AnimatedBeam
		v-if="container && from && to"
		:containerRef="container"
		:fromRef="from"
		:toRef="to"${rest(2)}
	/>
</div>`;
	}
	return `<script lang="ts">
let container = $state<HTMLElement>();
let from = $state<HTMLElement>();
let to = $state<HTMLElement>();
</script>

<div bind:this={container} class="${host}">
	<div bind:this={from} class="${node}">From</div>
	<div bind:this={to} class="${node}">To</div>
	{#if container && from && to}
		<AnimatedBeam
			containerRef={container}
			fromRef={from}
			toRef={to}${rest(3)}
		/>
	{/if}
</div>`;
}
