<script lang="ts">
	import { StarsBackground } from "$lib/fancy-ui/bg-stars";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
	import { bgStarsCode } from "./code.js";
</script>

<PropsPlayground
	component="StarsBackground"
	slug="bg-stars"
	codeFor={bgStarsCode}
	controls={[
		{ key: "factor", type: "range", label: "Parallax factor", min: 0, max: 0.3, step: 0.01 },
		{ key: "speed", type: "range", label: "Speed (s)", min: 10, max: 120, step: 5 },
		{ key: "stiffness", type: "range", label: "Stiffness", min: 10, max: 200, step: 5 },
		{ key: "damping", type: "range", label: "Damping", min: 5, max: 80, step: 1 },
		{ key: "starColor", type: "color", label: "Star color" },
	]}
	initialValues={{ factor: 0.05, speed: 50, stiffness: 50, damping: 20, starColor: "#ffffff" }}
>
	{#snippet preview(values)}
		<div
			class="relative w-[28rem] max-w-[85vw] overflow-hidden rounded-xl border border-black/[0.08] dark:border-white/[0.08]"
		>
			<StarsBackground
				class="h-64 bg-[#0b0b0c]"
				factor={values.factor as number}
				speed={values.speed as number}
				stiffness={values.stiffness as number}
				damping={values.damping as number}
				starColor={values.starColor as string}
			>
				<div class="relative z-10 flex h-full items-center justify-center">
					<p class="text-xl font-semibold text-white">Move your pointer</p>
				</div>
			</StarsBackground>
		</div>
	{/snippet}
</PropsPlayground>
