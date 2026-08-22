<script lang="ts">
	import { Skeleton } from "$lib/fancy-ui/skeleton";
	import { Presence } from "$lib/fancy-ui/presence";
	import { Button } from "$lib/fancy-ui/button";

	let loading = $state(true);
</script>

<div class="flex w-full flex-col items-center gap-4 p-6">
	<div class="bg-card border-border flex w-full max-w-sm items-start gap-3 rounded-xl border p-4">
		<!-- Avatar bone: label="" so only the text bone below announces "Loading" —
		     two Skeletons in one card shouldn't produce two live regions. -->
		<Skeleton variant="circle" {loading} label="" class="size-10 shrink-0" />
		<Skeleton variant="text" lines={3} {loading} class="w-full" />

		<!-- Presence stays mounted the whole time with `open={!loading}`; that's what
		     lets its fade actually play once loading flips (a Presence created already
		     `open` never plays its own intro — see Presence's own doc comment). -->
		<Presence open={!loading} preset="fade" class="flex w-full items-start gap-3">
			<div
				class="bg-primary/15 text-primary flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
				aria-hidden="true"
			>
				MC
			</div>
			<div class="flex flex-col gap-1">
				<p class="text-foreground text-sm font-medium">Maya Chen</p>
				<p class="text-muted-foreground text-sm">
					Approved the design — ship it whenever you're ready.
				</p>
			</div>
		</Presence>
	</div>

	<Button size="sm" variant="outline" onclick={() => (loading = !loading)}>
		{loading ? "Load message" : "Reset"}
	</Button>
</div>
