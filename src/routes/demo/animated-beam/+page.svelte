<script lang="ts">
	import { AnimatedBeam } from "$lib/fancy-ui/animated-beam";

	let containerRef: HTMLElement;
	let div1Ref: HTMLElement;
	let div2Ref: HTMLElement;
	let div3Ref: HTMLElement;
	let div4Ref: HTMLElement;
	let div5Ref: HTMLElement;
	let div6Ref: HTMLElement;
	let div7Ref: HTMLElement;
</script>

<svelte:head>
	<title>AnimatedBeam - FancyUI</title>
</svelte:head>

<div class="container mx-auto px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">AnimatedBeam</h1>
	<p class="text-muted-foreground mb-8">
		Animated SVG beams that connect elements with smooth gradients and customizable curves.
	</p>

	<!-- Basic Example -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Basic Usage</h2>
		<div
			bind:this={containerRef}
			class="bg-background relative flex h-[500px] w-full items-center justify-center overflow-hidden rounded-lg border p-10 md:shadow-xl"
		>
			<div
				class="flex size-full max-h-[200px] max-w-lg flex-col items-stretch justify-between gap-10"
			>
				<div class="flex flex-row items-center justify-between">
					<div
						bind:this={div1Ref}
						class="z-10 flex size-12 items-center justify-center rounded-full border-2 bg-blue-500 p-2 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]"
					>
						<span class="text-sm font-bold text-white">1</span>
					</div>
					<div
						bind:this={div5Ref}
						class="z-10 flex size-12 items-center justify-center rounded-full border-2 bg-green-500 p-2 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]"
					>
						<span class="text-sm font-bold text-white">5</span>
					</div>
				</div>
				<div class="flex flex-row items-center justify-between">
					<div
						bind:this={div2Ref}
						class="z-10 flex size-12 items-center justify-center rounded-full border-2 bg-purple-500 p-2 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]"
					>
						<span class="text-sm font-bold text-white">2</span>
					</div>
					<div
						bind:this={div4Ref}
						class="z-10 flex size-16 items-center justify-center rounded-full border-2 bg-orange-500 p-2 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]"
					>
						<span class="text-lg font-bold text-white">HUB</span>
					</div>
					<div
						bind:this={div6Ref}
						class="z-10 flex size-12 items-center justify-center rounded-full border-2 bg-pink-500 p-2 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]"
					>
						<span class="text-sm font-bold text-white">6</span>
					</div>
				</div>
				<div class="flex flex-row items-center justify-between">
					<div
						bind:this={div3Ref}
						class="z-10 flex size-12 items-center justify-center rounded-full border-2 bg-red-500 p-2 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]"
					>
						<span class="text-sm font-bold text-white">3</span>
					</div>
					<div
						bind:this={div7Ref}
						class="z-10 flex size-12 items-center justify-center rounded-full border-2 bg-teal-500 p-2 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]"
					>
						<span class="text-sm font-bold text-white">7</span>
					</div>
				</div>
			</div>

			{#if containerRef && div1Ref && div4Ref}
				<AnimatedBeam
					{containerRef}
					fromRef={div1Ref}
					toRef={div4Ref}
					curvature={-75}
					endYOffset={-10}
				/>
			{/if}
			{#if containerRef && div2Ref && div4Ref}
				<AnimatedBeam {containerRef} fromRef={div2Ref} toRef={div4Ref} />
			{/if}
			{#if containerRef && div3Ref && div4Ref}
				<AnimatedBeam
					{containerRef}
					fromRef={div3Ref}
					toRef={div4Ref}
					curvature={75}
					endYOffset={10}
				/>
			{/if}
			{#if containerRef && div5Ref && div4Ref}
				<AnimatedBeam
					{containerRef}
					fromRef={div5Ref}
					toRef={div4Ref}
					curvature={-75}
					endYOffset={-10}
					reverse={true}
				/>
			{/if}
			{#if containerRef && div6Ref && div4Ref}
				<AnimatedBeam {containerRef} fromRef={div6Ref} toRef={div4Ref} reverse={true} />
			{/if}
			{#if containerRef && div7Ref && div4Ref}
				<AnimatedBeam
					{containerRef}
					fromRef={div7Ref}
					toRef={div4Ref}
					curvature={75}
					endYOffset={10}
					reverse={true}
				/>
			{/if}
		</div>
	</section>

	<!-- Props Documentation -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Props</h2>
		<div class="overflow-hidden rounded-lg border">
			<table class="w-full">
				<thead class="bg-muted">
					<tr>
						<th class="p-3 text-left font-semibold">Prop</th>
						<th class="p-3 text-left font-semibold">Type</th>
						<th class="p-3 text-left font-semibold">Default</th>
						<th class="p-3 text-left font-semibold">Description</th>
					</tr>
				</thead>
				<tbody class="divide-y">
					<tr>
						<td class="p-3 font-mono text-sm">containerRef</td>
						<td class="p-3 font-mono text-sm">HTMLElement</td>
						<td class="p-3">-</td>
						<td class="p-3">Container element reference (required)</td>
					</tr>
					<tr>
						<td class="p-3 font-mono text-sm">fromRef</td>
						<td class="p-3 font-mono text-sm">HTMLElement</td>
						<td class="p-3">-</td>
						<td class="p-3">Starting element reference (required)</td>
					</tr>
					<tr>
						<td class="p-3 font-mono text-sm">toRef</td>
						<td class="p-3 font-mono text-sm">HTMLElement</td>
						<td class="p-3">-</td>
						<td class="p-3">Ending element reference (required)</td>
					</tr>
					<tr>
						<td class="p-3 font-mono text-sm">curvature</td>
						<td class="p-3 font-mono text-sm">number</td>
						<td class="p-3">0</td>
						<td class="p-3">Curve amount (positive/negative for direction)</td>
					</tr>
					<tr>
						<td class="p-3 font-mono text-sm">reverse</td>
						<td class="p-3 font-mono text-sm">boolean</td>
						<td class="p-3">false</td>
						<td class="p-3">Reverse animation direction</td>
					</tr>
					<tr>
						<td class="p-3 font-mono text-sm">pathColor</td>
						<td class="p-3 font-mono text-sm">string</td>
						<td class="p-3">gray</td>
						<td class="p-3">Static path color</td>
					</tr>
					<tr>
						<td class="p-3 font-mono text-sm">pathWidth</td>
						<td class="p-3 font-mono text-sm">number</td>
						<td class="p-3">2</td>
						<td class="p-3">Path stroke width</td>
					</tr>
					<tr>
						<td class="p-3 font-mono text-sm">pathOpacity</td>
						<td class="p-3 font-mono text-sm">number</td>
						<td class="p-3">0.2</td>
						<td class="p-3">Static path opacity</td>
					</tr>
					<tr>
						<td class="p-3 font-mono text-sm">gradientStartColor</td>
						<td class="p-3 font-mono text-sm">string</td>
						<td class="p-3">#FFAA40</td>
						<td class="p-3">Animated gradient start color</td>
					</tr>
					<tr>
						<td class="p-3 font-mono text-sm">gradientStopColor</td>
						<td class="p-3 font-mono text-sm">string</td>
						<td class="p-3">#9C40FF</td>
						<td class="p-3">Animated gradient stop color</td>
					</tr>
					<tr>
						<td class="p-3 font-mono text-sm">duration</td>
						<td class="p-3 font-mono text-sm">number</td>
						<td class="p-3">Random (4-7s)</td>
						<td class="p-3">Animation duration in seconds</td>
					</tr>
					<tr>
						<td class="p-3 font-mono text-sm">delay</td>
						<td class="p-3 font-mono text-sm">number</td>
						<td class="p-3">0</td>
						<td class="p-3">Animation delay in seconds</td>
					</tr>
					<tr>
						<td class="p-3 font-mono text-sm">startXOffset</td>
						<td class="p-3 font-mono text-sm">number</td>
						<td class="p-3">0</td>
						<td class="p-3">X offset from start element center</td>
					</tr>
					<tr>
						<td class="p-3 font-mono text-sm">startYOffset</td>
						<td class="p-3 font-mono text-sm">number</td>
						<td class="p-3">0</td>
						<td class="p-3">Y offset from start element center</td>
					</tr>
					<tr>
						<td class="p-3 font-mono text-sm">endXOffset</td>
						<td class="p-3 font-mono text-sm">number</td>
						<td class="p-3">0</td>
						<td class="p-3">X offset from end element center</td>
					</tr>
					<tr>
						<td class="p-3 font-mono text-sm">endYOffset</td>
						<td class="p-3 font-mono text-sm">number</td>
						<td class="p-3">0</td>
						<td class="p-3">Y offset from end element center</td>
					</tr>
				</tbody>
			</table>
		</div>
	</section>

	<!-- Usage Notes -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Usage Notes</h2>
		<div class="bg-card space-y-4 rounded-lg border p-6">
			<div>
				<h3 class="mb-2 font-semibold">Element References</h3>
				<p class="text-muted-foreground">
					The component requires element references using Svelte's <code
						class="bg-muted rounded px-1">bind:this</code
					>
					directive. Make sure all references are bound before rendering the AnimatedBeam.
				</p>
			</div>
			<div>
				<h3 class="mb-2 font-semibold">Curvature</h3>
				<p class="text-muted-foreground">
					Use positive values for upward curves and negative values for downward curves. The value
					represents the vertical offset of the curve's control point.
				</p>
			</div>
			<div>
				<h3 class="mb-2 font-semibold">Responsive Behavior</h3>
				<p class="text-muted-foreground">
					The component automatically updates the beam paths when the container is resized using
					ResizeObserver.
				</p>
			</div>
		</div>
	</section>
</div>
