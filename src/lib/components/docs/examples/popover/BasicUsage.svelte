<script lang="ts">
	import { Popover } from "$lib/fancy-ui/popover";

	let width = $state("100%");
	let height = $state("25px");
</script>

<Popover class="w-[220px]">
	{#snippet trigger()}
		⚙ Options
	{/snippet}

	<span class="text-[13px] font-semibold">Dimensions</span>
	<div class="flex gap-2">
		<input
			bind:value={width}
			aria-label="Width"
			class="border-input bg-background text-foreground min-w-0 flex-1 rounded-[6px] border px-2 py-[5px] text-[12px]"
		/>
		<input
			bind:value={height}
			aria-label="Height"
			class="border-input bg-background text-foreground min-w-0 flex-1 rounded-[6px] border px-2 py-[5px] text-[12px]"
		/>
	</div>
</Popover>
