<script lang="ts">
	import { Sheet, type SheetSide } from "$lib/fancy-ui/sheet";
	import { Button } from "$lib/fancy-ui/button";

	let open = $state(false);
	let side = $state<SheetSide>("right");

	function openFrom(next: SheetSide) {
		side = next;
		open = true;
	}
</script>

<div class="flex flex-wrap gap-2">
	<Button variant="outline" onclick={() => openFrom("left")}>Left</Button>
	<Button variant="outline" onclick={() => openFrom("right")}>Right</Button>
	<Button variant="outline" onclick={() => openFrom("top")}>Top</Button>
	<Button variant="outline" onclick={() => openFrom("bottom")}>Bottom</Button>
</div>

<Sheet sound bind:open {side} title="Panel" description="Slides in from {side}.">
	<p class="text-muted-foreground text-[13px]">Body content goes here.</p>
</Sheet>
