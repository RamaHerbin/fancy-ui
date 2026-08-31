<script lang="ts">
	import { Checkbox } from "$lib/fancy-ui/checkbox";

	let items = $state([
		{ label: "Design", done: true },
		{ label: "Build", done: false },
		{ label: "Ship", done: false },
	]);

	const allDone = $derived(items.every((item) => item.done));
	const noneDone = $derived(items.every((item) => !item.done));

	function setAll(checked: boolean) {
		items = items.map((item) => ({ ...item, done: checked }));
	}
</script>

<div class="flex flex-col gap-3">
	<Checkbox sound checked={allDone} indeterminate={!allDone && !noneDone} onCheckedChange={setAll}>
		Select all
	</Checkbox>
	<div class="border-border ml-[10px] flex flex-col gap-2 border-l pl-4">
		{#each items as item, index (item.label)}
			<Checkbox
				sound
				checked={item.done}
				onCheckedChange={(checked) => (items[index] = { ...item, done: checked })}
			>
				{item.label}
			</Checkbox>
		{/each}
	</div>
</div>
