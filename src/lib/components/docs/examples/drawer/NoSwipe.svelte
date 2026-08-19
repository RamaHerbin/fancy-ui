<script lang="ts">
	import { Drawer } from "$lib/fancy-ui/drawer";
	import { Button } from "$lib/fancy-ui/button";

	let open = $state(false);
</script>

<Button onclick={() => (open = true)}>Open drawer</Button>

<Drawer
	bind:open
	swipeToClose={false}
	title="Filters"
	description="Swipe is off here — close with Escape, the scrim, or the close button."
>
	<p class="text-muted-foreground text-[13px]">Body content goes here.</p>
</Drawer>
