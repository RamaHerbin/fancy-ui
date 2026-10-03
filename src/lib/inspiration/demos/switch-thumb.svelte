<script lang="ts">
	import type { PlaygroundValues } from "$lib/inspiration/types.js";
	import { Switch, type SwitchSize } from "$lib/fancy-ui/switch";

	let { values }: { values: PlaygroundValues } = $props();

	let notify = $state(true);
	let sound = $state(true);
	let digest = $state(false);
</script>

<div class="flex h-full w-full items-center justify-center p-6">
	<div class="border-border bg-card flex w-56 flex-col gap-3 rounded-xl border p-4">
		<Switch bind:checked={notify} size={values.size as SwitchSize} sound={values.sound as boolean}>
			<span class="text-foreground">Notify me</span>
		</Switch>
		<div data-capture="click" data-capture-wait="70" class="flex w-fit">
			<Switch bind:checked={sound} size={values.size as SwitchSize} sound={values.sound as boolean}>
				<span class="text-foreground">Play sounds</span>
			</Switch>
		</div>
		<Switch bind:checked={digest} size={values.size as SwitchSize} sound={values.sound as boolean}>
			<span class="text-foreground">Weekly digest</span>
		</Switch>
	</div>
</div>
