<script lang="ts">
	import {
		MagneticField,
		MagneticItem,
		MagnetPuck,
		type MagneticPoint,
	} from "$lib/fancy-ui/magnetic-field";

	// A deterministic spread of weights so the grid parts unevenly.
	const tiles = Array.from({ length: 28 }, (_, i) => ({
		id: i,
		mass: 0.7 + ((i * 7) % 5) * 0.15,
	}));

	let field = $state<HTMLDivElement | null>(null);
	let position = $state<MagneticPoint>({ x: 48, y: 48 });
	let placed = $state(false);

	// Start the puck in the middle of the grid, once the field has a size. It
	// stays hidden until then, so the first paint never shows it in a corner.
	$effect(() => {
		if (!field || placed) return;
		placed = true;
		position = { x: field.clientWidth / 2, y: field.clientHeight / 2 };
	});
</script>

<!-- `polarity={-1}` pushes the tiles away. The puck is `sticky`, so it keeps
     pushing where you leave it; `source="manual"` without a `position` means
     the puck is the only magnet, on touch screens too. -->
<MagneticField
	bind:ref={field}
	source="manual"
	polarity={-1}
	radius={110}
	maxTranslate={16}
	maxRotate={8}
	class="bg-card mx-auto grid w-full max-w-lg grid-cols-7 gap-4 rounded-2xl border p-8"
>
	{#each tiles as tile (tile.id)}
		<MagneticItem mass={tile.mass}>
			<span class="bg-muted block aspect-square rounded-lg border shadow-xs"></span>
		</MagneticItem>
	{/each}
	<MagnetPuck
		bind:position
		sticky
		size={44}
		label="Magnet: drag it, or use the arrow keys"
		class={placed ? undefined : "opacity-0"}
	/>
</MagneticField>
