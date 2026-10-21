<script lang="ts">
	import { Drawer } from "$lib/fancy-ui/drawer";
	import { Button } from "$lib/fancy-ui/button";

	let open = $state(false);
	const uid = $props.id();
	const panelId = `${uid}-panel`;
	let sortBy = $state("recent");
</script>

<Button
	onclick={() => (open = true)}
	aria-haspopup="dialog"
	aria-expanded={open}
	aria-controls={open ? panelId : undefined}
>
	Open filters
</Button>

<Drawer sound bind:open id={panelId} title="Filters" description="Drag down to close.">
	<div class="flex flex-col gap-2">
		<label class="text-muted-foreground flex items-center gap-2 text-[13px]">
			<input type="radio" name="sort" value="recent" bind:group={sortBy} />
			Most recent
		</label>
		<label class="text-muted-foreground flex items-center gap-2 text-[13px]">
			<input type="radio" name="sort" value="popular" bind:group={sortBy} />
			Most popular
		</label>
	</div>
</Drawer>
