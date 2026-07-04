<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { LiquidGlass } from "$lib/fancy-ui/liquid-glass";

	const { Story } = defineMeta({
		title: "Effects/LiquidGlass",
		component: LiquidGlass,
		tags: ["autodocs"],
		args: {
			radius: 20,
			frost: 0.05,
			scale: -180,
			blur: 11,
			lightness: 50,
		},
		argTypes: {
			radius: {
				control: { type: "range", min: 0, max: 60, step: 2 },
				description: "Border radius in pixels",
			},
			frost: {
				control: { type: "range", min: 0, max: 1, step: 0.05 },
				description: "Frosted glass opacity",
			},
			scale: {
				control: { type: "range", min: -300, max: 0, step: 10 },
				description: "Displacement scale (strength of refraction)",
			},
			blur: {
				control: { type: "range", min: 0, max: 30, step: 1 },
				description: "Blur applied to the displacement map",
			},
			lightness: {
				control: { type: "range", min: 0, max: 100, step: 5 },
				description: "Background lightness percentage",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div
		class="relative flex h-80 w-[480px] items-center justify-center overflow-hidden rounded-lg border"
	>
		<div
			class="absolute top-1/4 left-1/4 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/30 blur-3xl"
		></div>
		<div class="absolute right-1/4 bottom-1/3 h-48 w-48 rounded-full bg-cyan-500/30 blur-3xl"></div>
		<div
			class="absolute bottom-1/4 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-rose-500/25 blur-3xl"
		></div>

		<div class="absolute inset-0 z-[1] overflow-y-auto" style="scrollbar-width: none;">
			<div class="space-y-8 px-10 py-16" style="min-height: 220%;">
				{#each Array(6) as _, i}
					<div class="flex gap-4">
						{#each Array(5) as _, j}
							<div
								class="h-16 flex-1 rounded-xl"
								style="background: hsl({(i * 5 + j) * 28}, 65%, 55%); opacity: 0.75;"
							></div>
						{/each}
					</div>
					<p class="px-1 text-base font-medium text-white/50">Chromatic displacement in action.</p>
				{/each}
			</div>
		</div>

		<div class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
			<div class="pointer-events-auto">
				<LiquidGlass {...args}>
					<div
						class="flex min-h-16 w-full items-center justify-center px-12 py-4 text-base font-medium text-white"
					>
						Liquid Glass. Try scrolling.
					</div>
				</LiquidGlass>
			</div>
		</div>
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Frosted" {template} args={{ frost: 0.3 }} />

<Story name="Strong Refraction" {template} args={{ scale: -260, radius: 32 }} />
