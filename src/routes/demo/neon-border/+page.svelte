<script lang="ts">
	import { NeonBorder } from '$lib/fancy-ui/neon-border';
</script>

<svelte:head>
	<title>NeonBorder - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl py-12 px-4">
	<h1 class="text-3xl font-bold mb-2">NeonBorder</h1>
	<p class="text-muted-foreground mb-8">
		Dual-color neon glow border effect with optional rotation animation.
	</p>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Basic Usage</h2>
		<div class="rounded-lg border bg-card p-6 flex justify-center">
			<NeonBorder>
				<div class="flex h-full w-full items-center justify-center rounded-lg bg-background px-6 py-2">
					<span class="text-sm font-medium">Neon Border</span>
				</div>
			</NeonBorder>
		</div>
	</section>

	<!-- Animation Types -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Animation Types</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Control coverage with <code class="rounded bg-muted px-1.5 py-0.5">animationType</code>.
		</p>
		<div class="rounded-lg border bg-card p-6 flex flex-wrap gap-6 justify-center">
			<NeonBorder animationType="none" class="max-w-[200px]">
				<div class="flex h-full w-full items-center justify-center rounded-lg bg-background px-4 py-2">
					<span class="text-xs">none (static)</span>
				</div>
			</NeonBorder>
			<NeonBorder animationType="half" class="max-w-[200px]">
				<div class="flex h-full w-full items-center justify-center rounded-lg bg-background px-4 py-2">
					<span class="text-xs">half</span>
				</div>
			</NeonBorder>
			<NeonBorder animationType="full" class="max-w-[200px]">
				<div class="flex h-full w-full items-center justify-center rounded-lg bg-background px-4 py-2">
					<span class="text-xs">full</span>
				</div>
			</NeonBorder>
		</div>
	</section>

	<!-- Custom Colors -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Custom Colors</h2>
		<div class="rounded-lg border bg-card p-6 flex flex-wrap gap-6 justify-center">
			<NeonBorder color1="#22c55e" color2="#3b82f6" class="max-w-[200px]">
				<div class="flex h-full w-full items-center justify-center rounded-lg bg-background px-4 py-2">
					<span class="text-xs">Green → Blue</span>
				</div>
			</NeonBorder>
			<NeonBorder color1="#f59e0b" color2="#ef4444" class="max-w-[200px]">
				<div class="flex h-full w-full items-center justify-center rounded-lg bg-background px-4 py-2">
					<span class="text-xs">Amber → Red</span>
				</div>
			</NeonBorder>
			<NeonBorder color1="#a855f7" color2="#ec4899" class="max-w-[200px]">
				<div class="flex h-full w-full items-center justify-center rounded-lg bg-background px-4 py-2">
					<span class="text-xs">Purple → Pink</span>
				</div>
			</NeonBorder>
		</div>
	</section>

	<!-- Speed Variations -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Speed Variations</h2>
		<div class="rounded-lg border bg-card p-6 flex flex-wrap gap-6 justify-center">
			<NeonBorder duration={2} class="max-w-[200px]">
				<div class="flex h-full w-full items-center justify-center rounded-lg bg-background px-4 py-2">
					<span class="text-xs">Fast (2s)</span>
				</div>
			</NeonBorder>
			<NeonBorder duration={6} class="max-w-[200px]">
				<div class="flex h-full w-full items-center justify-center rounded-lg bg-background px-4 py-2">
					<span class="text-xs">Default (6s)</span>
				</div>
			</NeonBorder>
			<NeonBorder duration={15} class="max-w-[200px]">
				<div class="flex h-full w-full items-center justify-center rounded-lg bg-background px-4 py-2">
					<span class="text-xs">Slow (15s)</span>
				</div>
			</NeonBorder>
		</div>
	</section>
</div>
