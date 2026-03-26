<script lang="ts">
	import { NeonBorder } from "$lib/fancy-ui/neon-border";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
</script>

<svelte:head>
	<title>NeonBorder - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">NeonBorder</h1>
	<p class="text-muted-foreground mb-8">
		Dual-color neon glow border effect with optional rotation animation.
	</p>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Basic Usage</h2>
		<div class="bg-card flex justify-center rounded-lg border p-6">
			<NeonBorder>
				<div
					class="bg-background flex h-full w-full items-center justify-center rounded-lg px-6 py-2"
				>
					<span class="text-sm font-medium">Neon Border</span>
				</div>
			</NeonBorder>
		</div>
	</section>

	<!-- Animation Types -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Animation Types</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Control coverage with <code class="bg-muted rounded px-1.5 py-0.5">animationType</code>.
		</p>
		<div class="bg-card flex flex-wrap justify-center gap-6 rounded-lg border p-6">
			<NeonBorder animationType="none" class="max-w-[200px]">
				<div
					class="bg-background flex h-full w-full items-center justify-center rounded-lg px-4 py-2"
				>
					<span class="text-xs">none (static)</span>
				</div>
			</NeonBorder>
			<NeonBorder animationType="half" class="max-w-[200px]">
				<div
					class="bg-background flex h-full w-full items-center justify-center rounded-lg px-4 py-2"
				>
					<span class="text-xs">half</span>
				</div>
			</NeonBorder>
			<NeonBorder animationType="full" class="max-w-[200px]">
				<div
					class="bg-background flex h-full w-full items-center justify-center rounded-lg px-4 py-2"
				>
					<span class="text-xs">full</span>
				</div>
			</NeonBorder>
		</div>
	</section>

	<!-- Custom Colors -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Custom Colors</h2>
		<div class="bg-card flex flex-wrap justify-center gap-6 rounded-lg border p-6">
			<NeonBorder color1="#22c55e" color2="#3b82f6" class="max-w-[200px]">
				<div
					class="bg-background flex h-full w-full items-center justify-center rounded-lg px-4 py-2"
				>
					<span class="text-xs">Green → Blue</span>
				</div>
			</NeonBorder>
			<NeonBorder color1="#f59e0b" color2="#ef4444" class="max-w-[200px]">
				<div
					class="bg-background flex h-full w-full items-center justify-center rounded-lg px-4 py-2"
				>
					<span class="text-xs">Amber → Red</span>
				</div>
			</NeonBorder>
			<NeonBorder color1="#a855f7" color2="#ec4899" class="max-w-[200px]">
				<div
					class="bg-background flex h-full w-full items-center justify-center rounded-lg px-4 py-2"
				>
					<span class="text-xs">Purple → Pink</span>
				</div>
			</NeonBorder>
		</div>
	</section>

	<!-- Speed Variations -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Speed Variations</h2>
		<div class="bg-card flex flex-wrap justify-center gap-6 rounded-lg border p-6">
			<NeonBorder duration={2} class="max-w-[200px]">
				<div
					class="bg-background flex h-full w-full items-center justify-center rounded-lg px-4 py-2"
				>
					<span class="text-xs">Fast (2s)</span>
				</div>
			</NeonBorder>
			<NeonBorder duration={6} class="max-w-[200px]">
				<div
					class="bg-background flex h-full w-full items-center justify-center rounded-lg px-4 py-2"
				>
					<span class="text-xs">Default (6s)</span>
				</div>
			</NeonBorder>
			<NeonBorder duration={15} class="max-w-[200px]">
				<div
					class="bg-background flex h-full w-full items-center justify-center rounded-lg px-4 py-2"
				>
					<span class="text-xs">Slow (15s)</span>
				</div>
			</NeonBorder>
		</div>
	</section>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Interactive Playground</h2>
		<PropsPlayground
			controls={[
				{ key: "color1", type: "color", label: "Color 1" },
				{ key: "color2", type: "color", label: "Color 2" },
				{
					key: "animationType",
					type: "select",
					label: "Animation Type",
					options: [
						{ value: "none", label: "None (static)" },
						{ value: "half", label: "Half" },
						{ value: "full", label: "Full" },
					],
				},
				{ key: "duration", type: "range", label: "Duration (s)", min: 1, max: 20, step: 1 },
			]}
			initialValues={{ color1: "#0496ff", color2: "#ff0a54", animationType: "half", duration: 6 }}
		>
			{#snippet preview(values)}
				<div class="flex items-center justify-center py-8">
					<NeonBorder
						color1={values.color1 as string}
						color2={values.color2 as string}
						animationType={values.animationType as "none" | "half" | "full"}
						duration={values.duration as number}
					>
						<div
							class="bg-background flex h-full w-full items-center justify-center rounded-lg px-8 py-3"
						>
							<span class="font-medium">Neon Border</span>
						</div>
					</NeonBorder>
				</div>
			{/snippet}
		</PropsPlayground>
	</section>
</div>
