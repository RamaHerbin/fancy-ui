<script lang="ts">
	import { AnimatedBeam } from "$lib/fancy-ui/animated-beam";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
	import { animatedBeamCode } from "./code.js";
	import FileText from "@lucide/svelte/icons/file-text";
	import Sparkles from "@lucide/svelte/icons/sparkles";

	let containerRef = $state<HTMLElement>();
	let fromRef = $state<HTMLElement>();
	let toRef = $state<HTMLElement>();

	const node =
		"relative z-10 flex size-12 items-center justify-center rounded-xl border border-black/[0.08] bg-white text-neutral-700 dark:border-white/[0.08] dark:bg-[#141416] dark:text-neutral-300";
</script>

<PropsPlayground
	component="AnimatedBeam"
	slug="animated-beam"
	codeFor={animatedBeamCode}
	constraints={["Mount it in a relative container and pass the container and both node elements."]}
	controls={[
		{ key: "curvature", type: "range", label: "Curvature", min: -120, max: 120, step: 5 },
		{ key: "reverse", type: "boolean", label: "Reverse" },
		{ key: "pathWidth", type: "range", label: "Path width", min: 1, max: 8, step: 0.5 },
		{ key: "pulses", type: "range", label: "Pulses", min: 1, max: 4, step: 1 },
		{ key: "tail", type: "range", label: "Tail", min: 0.05, max: 0.9, step: 0.05 },
		{ key: "glow", type: "range", label: "Glow", min: 0, max: 1, step: 0.05 },
		{ key: "duration", type: "range", label: "Duration (s)", min: 2, max: 12, step: 0.5 },
		{ key: "delay", type: "range", label: "Delay (s)", min: 0, max: 5, step: 0.5 },
		{ key: "gradientStartColor", type: "color", label: "Start color" },
		{ key: "gradientStopColor", type: "color", label: "Stop color" },
	]}
	initialValues={{
		curvature: 0,
		reverse: false,
		pathWidth: 2,
		pulses: 1,
		tail: 0.35,
		glow: 0.6,
		duration: 5,
		delay: 0,
		gradientStartColor: "#ffaa40",
		gradientStopColor: "#9c40ff",
	}}
>
	{#snippet preview(values)}
		<div
			bind:this={containerRef}
			class="relative flex h-48 w-[28rem] max-w-[85vw] items-center justify-between overflow-hidden rounded-xl border border-black/[0.08] bg-[#fafafa] px-10 dark:border-white/[0.08] dark:bg-[#0b0b0c]"
		>
			<div bind:this={fromRef} class={node}><FileText class="size-5" strokeWidth={1.6} /></div>
			<div bind:this={toRef} class={node}><Sparkles class="size-5" strokeWidth={1.6} /></div>
			{#if containerRef && fromRef && toRef}
				<AnimatedBeam
					{containerRef}
					{fromRef}
					{toRef}
					curvature={values.curvature as number}
					reverse={values.reverse as boolean}
					pathWidth={values.pathWidth as number}
					pulses={values.pulses as number}
					tail={values.tail as number}
					glow={values.glow as number}
					duration={values.duration as number}
					delay={values.delay as number}
					gradientStartColor={values.gradientStartColor as string}
					gradientStopColor={values.gradientStopColor as string}
				/>
			{/if}
		</div>
	{/snippet}
</PropsPlayground>
