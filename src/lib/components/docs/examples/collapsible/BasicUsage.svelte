<script lang="ts">
	import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "$lib/fancy-ui/collapsible";

	let open = $state(false);
</script>

<Collapsible bind:open class="w-full max-w-sm">
	<div class="flex items-center justify-between gap-4">
		<h4 class="text-sm font-semibold">3 repositories starred</h4>
		<CollapsibleTrigger class="rounded-md border px-3 py-1 text-sm">
			{open ? "Show less" : "Show more"}
		</CollapsibleTrigger>
	</div>
	<div class="mt-2 rounded-md border px-3 py-2 font-mono text-sm">fancy-ui/core</div>
	<CollapsibleContent>
		<div class="mt-2 flex flex-col gap-2">
			<div class="rounded-md border px-3 py-2 font-mono text-sm">fancy-ui/motion</div>
			<div class="rounded-md border px-3 py-2 font-mono text-sm">fancy-ui/registry</div>
		</div>
	</CollapsibleContent>
</Collapsible>
