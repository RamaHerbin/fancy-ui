<script lang="ts">
	import type { PlaygroundValues } from "$lib/inspiration/types.js";
	import { Meteors } from "$lib/fancy-ui/meteors";
	import HdrBadge from "$lib/components/inspiration/HdrBadge.svelte";

	let { values }: { values: PlaygroundValues } = $props();
</script>

<div
	class="bg-background relative flex h-full w-full items-center justify-center overflow-hidden p-6"
>
	<Meteors
		hdr={values.hdr !== false}
		count={values.count as number}
		angle={values.angle as number}
		speed={values.speed as number}
		seed={7}
	/>
	<p class="text-foreground relative z-10 text-center text-sm">Meteor shower</p>
	<HdrBadge />
</div>
