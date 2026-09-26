<script lang="ts">
	import type { PlaygroundValues } from "$lib/finds/types.js";
	import { Switch, type SwitchSize } from "$lib/fancy-ui/switch";

	let { values }: { values: PlaygroundValues } = $props();

	let checked = $state(true);
</script>

<div class="flex h-full w-full items-center justify-center p-6">
	<Switch
		bind:checked
		size={values.size as SwitchSize}
		sound={values.sound as boolean}
		label="Notify me"
	/>
</div>
