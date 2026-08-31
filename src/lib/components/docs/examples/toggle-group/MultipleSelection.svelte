<script lang="ts">
	import { ToggleGroup, ToggleGroupItem } from "$lib/fancy-ui/toggle-group";

	let marks = $state<string[]>(["bold"]);
</script>

<div class="flex flex-col gap-3">
	<ToggleGroup sound type="multiple" bind:value={marks} label="Formatting">
		<ToggleGroupItem value="bold" label="Bold"><strong>B</strong></ToggleGroupItem>
		<ToggleGroupItem value="italic" label="Italic"><em>I</em></ToggleGroupItem>
		<ToggleGroupItem value="underline" label="Underline">
			<span class="underline">U</span>
		</ToggleGroupItem>
	</ToggleGroup>

	<p
		class="text-sm"
		class:font-bold={marks.includes("bold")}
		class:italic={marks.includes("italic")}
		class:underline={marks.includes("underline")}
	>
		Toggle the marks above to preview how this sentence would look.
	</p>
</div>
