<script lang="ts">
	import { Reveal } from "$lib/fancy-ui/reveal";
	import { Button } from "$lib/fancy-ui/button";

	// Remounting Reveal (via {#key}) re-plays trigger="mount"'s next-frame
	// reveal from scratch — the simplest way to give this preview a working
	// "Replay" button without reaching for trigger="manual" timing tricks.
	let replayKey = $state(0);
</script>

<div class="flex w-full flex-col gap-4 p-6">
	<div class="flex justify-end">
		<Button variant="outline" size="sm" onclick={() => replayKey++}>Replay</Button>
	</div>

	{#key replayKey}
		<!-- stagger widened from the 50ms ladder step so the cascade reads at preview size -->
		<Reveal trigger="mount" stagger={80} class="grid grid-cols-1 gap-4 sm:grid-cols-3">
			<div class="bg-card border-border rounded-lg border p-4">
				<h3 class="text-foreground text-sm font-semibold">Fast setup</h3>
				<p class="text-muted-foreground mt-1 text-sm">
					Drop it around any content, no config required.
				</p>
			</div>
			<div class="bg-card border-border rounded-lg border p-4">
				<h3 class="text-foreground text-sm font-semibold">Accessible by default</h3>
				<p class="text-muted-foreground mt-1 text-sm">
					Keyboard focus and reduced motion are both handled for you.
				</p>
			</div>
			<div class="bg-card border-border rounded-lg border p-4">
				<h3 class="text-foreground text-sm font-semibold">Themeable</h3>
				<p class="text-muted-foreground mt-1 text-sm">
					Every timing and distance is a CSS variable.
				</p>
			</div>
		</Reveal>
	{/key}
</div>
