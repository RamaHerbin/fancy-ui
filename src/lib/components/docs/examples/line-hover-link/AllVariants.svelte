<script lang="ts">
	import { LineHoverLink } from "$lib/fancy-ui/line-hover-link";
	import type { LineHoverVariant } from "$lib/fancy-ui/line-hover-link";

	const variants: { variant: LineHoverVariant; label: string }[] = [
		{ variant: "slide", label: "Slide" },
		{ variant: "double", label: "Double" },
		{ variant: "grow", label: "Grow" },
		{ variant: "strike", label: "Strike" },
		{ variant: "fade", label: "Fade" },
		{ variant: "pulse", label: "Pulse" },
		{ variant: "swap", label: "Swap" },
		{ variant: "sweep", label: "Sweep" },
		{ variant: "bounce", label: "Bounce" },
		{ variant: "arc", label: "Arc" },
		{ variant: "scribble", label: "Scribble" },
		{ variant: "ink", label: "Ink" },
	];
</script>

<div class="flex min-h-[280px] items-center justify-center p-12">
	<div class="grid grid-cols-3 gap-x-16 gap-y-10 md:grid-cols-4">
		{#each variants as { variant, label }}
			<div class="text-center">
				<LineHoverLink sound {variant} href="#" class="text-lg font-medium">
					{label}
				</LineHoverLink>
			</div>
		{/each}
	</div>
</div>
