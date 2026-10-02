<script lang="ts">
	import type { PlaygroundValues } from "$lib/finds/types.js";
	import { Magnetic } from "$lib/fancy-ui/magnetic";
	import { Button } from "$lib/fancy-ui/button";

	let { values }: { values: PlaygroundValues } = $props();
</script>

<div class="flex h-full w-full items-center justify-center p-6">
	<Magnetic
		strength={values.strength as number}
		radius={values.radius as number}
		max={values.max as number}
	>
		<Button variant="outline">Get in touch</Button>
	</Magnetic>
</div>
