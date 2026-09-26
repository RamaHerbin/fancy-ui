<script lang="ts">
	import type { PlaygroundValues } from "$lib/finds/types.js";
	import { Presence } from "$lib/fancy-ui/presence";
	import type { PresenceProps } from "$lib/fancy-ui/presence";

	let { values }: { values: PlaygroundValues } = $props();

	let open = $state(true);
</script>

<div class="flex h-full w-full flex-col items-center justify-center gap-4 p-6">
	<button
		type="button"
		onclick={() => (open = !open)}
		class="bg-card border-border text-foreground hover:bg-muted rounded-full border px-4 py-1.5 text-sm transition-colors"
	>
		{open ? "Hide" : "Show"}
	</button>

	<div class="flex h-24 w-56 items-center justify-center">
		<Presence
			{open}
			preset={values.preset as PresenceProps["preset"]}
			duration={values.duration as number}
			exitDuration={values.exitDuration as number}
		>
			<div class="bg-card border-border rounded-lg border px-4 py-3 text-center">
				<p class="text-foreground text-sm font-medium">Draft saved</p>
				<p class="text-muted-foreground mt-0.5 text-xs">Every change, automatically</p>
			</div>
		</Presence>
	</div>
</div>
