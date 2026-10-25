<script lang="ts">
	import type { PlaygroundValues } from "$lib/inspiration/types.js";
	import { PixelScene, type PixelSceneName } from "$lib/fancy-ui/pixel-scene";

	let { values }: { values: PlaygroundValues } = $props();

	// The component never changes `night`: the knob sets it, a click flips it.
	let night = $state(true);
	$effect(() => {
		night = values.night !== false;
	});
</script>

<PixelScene
	scene={values.scene as PixelSceneName}
	{night}
	lensRadius={values.lensRadius as number}
	hdr={values.hdr !== false}
	surfaces={["#efe9dc", "#08080c"]}
	inks={["#2a2620", "#e8e4da"]}
	onclick={() => (night = !night)}
	class="finds-pixel h-full w-full cursor-pointer"
>
	<p
		class="pointer-events-none absolute top-4 left-4 font-mono text-[10px] tracking-[0.2em] uppercase opacity-60 {night
			? 'text-[#e8e4da]'
			: 'text-[#2a2620]'}"
	>
		Move to look · click for {night ? "day" : "night"}
	</p>
</PixelScene>
