<script lang="ts">
	import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "$lib/fancy-ui/collapsible";
	import { Button } from "$lib/fancy-ui/button";

	let open = $state(false);
	let changes = $state(0);
</script>

<div class="flex w-full max-w-sm flex-col gap-3">
	<div class="flex flex-wrap items-center gap-2">
		<Button size="sm" variant="outline" onclick={() => (open = !open)}>Toggle from outside</Button>
		<span class="text-muted-foreground text-sm">
			{open ? "open" : "closed"} · {changes} change{changes === 1 ? "" : "s"} from the trigger
		</span>
	</div>

	<Collapsible bind:open onOpenChange={() => (changes += 1)} class="rounded-md border px-3">
		<CollapsibleTrigger class="flex w-full items-center justify-between py-2 text-sm font-medium">
			Release notes
		</CollapsibleTrigger>
		<CollapsibleContent class="text-muted-foreground pb-2 text-sm">
			Both the trigger and the button above drive the same state; only the trigger reports through
			onOpenChange.
		</CollapsibleContent>
	</Collapsible>
</div>
