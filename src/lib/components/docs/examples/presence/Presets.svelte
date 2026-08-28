<script lang="ts">
	import { Presence } from "$lib/fancy-ui/presence";
	import { Button } from "$lib/fancy-ui/button";

	const presets = ["fade", "fade-up", "scale", "blur", "zoom"] as const;
	let preset = $state<(typeof presets)[number]>("fade-up");
	let open = $state(true);
</script>

<div class="flex w-full flex-col gap-4 p-6">
	<div class="flex flex-wrap gap-2">
		{#each presets as p (p)}
			<button
				type="button"
				class={`rounded-full border px-3 py-1 text-xs capitalize ${
					preset === p
						? "bg-primary text-primary-foreground border-primary"
						: "border-border text-muted-foreground"
				}`}
				onclick={() => (preset = p)}
			>
				{p}
			</button>
		{/each}
	</div>

	<Button variant="outline" size="sm" class="self-start" onclick={() => (open = !open)}>
		{open ? "Hide" : "Show"} panel
	</Button>

	<div
		class="bg-muted/40 border-border flex h-24 items-center justify-center rounded-lg border border-dashed"
	>
		<Presence {open} {preset}>
			<div class="bg-card border-border rounded-lg border p-4 shadow-sm">
				<p class="text-foreground text-sm font-medium">{preset} preset</p>
			</div>
		</Presence>
	</div>
</div>
