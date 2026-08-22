<script lang="ts">
	import { Reveal } from "$lib/fancy-ui/reveal";
	import { Button } from "$lib/fancy-ui/button";

	let active = $state(false);
</script>

<div class="flex w-full flex-col items-start gap-4 p-6">
	<Button variant="outline" size="sm" onclick={() => (active = !active)}>
		{active ? "Hide details" : "Show details"}
	</Button>

	<Reveal
		trigger="manual"
		{active}
		preset="fade-up"
		class="bg-card border-border w-full rounded-lg border p-4"
	>
		<p class="text-muted-foreground text-sm">
			`trigger="manual"` mirrors the `active` prop directly — no viewport or mount timing involved,
			so any external state can drive the reveal.
		</p>
	</Reveal>
</div>
