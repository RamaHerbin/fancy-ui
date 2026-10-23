<script lang="ts">
	import type { PlaygroundValues } from "$lib/inspiration/types.js";
	import { CardSpotlight } from "$lib/fancy-ui/card-spotlight";
	import HdrBadge from "$lib/components/inspiration/HdrBadge.svelte";

	let { values }: { values: PlaygroundValues } = $props();
</script>

<div class="relative flex h-full w-full items-center justify-center p-6">
	<CardSpotlight
		class="h-40 w-64"
		gradientSize={values.gradientSize as number}
		gradientColor={values.gradientColor as string}
		gradientOpacity={values.gradientOpacity as number}
		hdr={values.hdr === true}
	>
		<div class="flex h-full w-full flex-col justify-center p-6">
			<h3 class="text-sm font-bold">Spotlight card</h3>
			<p class="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
				The light follows the cursor.
			</p>
		</div>
	</CardSpotlight>
	<HdrBadge />
</div>
