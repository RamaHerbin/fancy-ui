<script lang="ts">
	import { PulseBeam, type PulseBeamPalette } from "$lib/fancy-ui/pulse-beam";

	const palettes: PulseBeamPalette[] = ["colorful", "mono", "ocean", "sunset"];
</script>

<div class="grid w-full max-w-lg grid-cols-2 gap-4">
	{#each palettes as palette (palette)}
		<PulseBeam {palette} radius={14}>
			<div class="bg-card rounded-[14px] p-4">
				<p class="text-sm font-medium capitalize">{palette}</p>
				<p class="text-muted-foreground mt-1 text-xs">
					{palette === "mono" ? "Halved opacity, no hue drift" : "Full palette with hue drift"}
				</p>
			</div>
		</PulseBeam>
	{/each}
</div>
