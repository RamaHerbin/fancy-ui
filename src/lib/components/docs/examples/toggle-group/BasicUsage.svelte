<script lang="ts">
	import { ToggleGroup, ToggleGroupItem } from "$lib/fancy-ui/toggle-group";

	let alignment = $state("left");
</script>

<ToggleGroup sound bind:value={alignment} label="Text alignment">
	<ToggleGroupItem value="left" label="Align left">
		<svg
			class="size-4"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			aria-hidden="true"
		>
			<line x1="3" y1="6" x2="21" y2="6" />
			<line x1="3" y1="12" x2="15" y2="12" />
			<line x1="3" y1="18" x2="18" y2="18" />
		</svg>
	</ToggleGroupItem>
	<ToggleGroupItem value="center" label="Align center">
		<svg
			class="size-4"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			aria-hidden="true"
		>
			<line x1="3" y1="6" x2="21" y2="6" />
			<line x1="6" y1="12" x2="18" y2="12" />
			<line x1="4" y1="18" x2="20" y2="18" />
		</svg>
	</ToggleGroupItem>
	<ToggleGroupItem value="right" label="Align right">
		<svg
			class="size-4"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			aria-hidden="true"
		>
			<line x1="3" y1="6" x2="21" y2="6" />
			<line x1="9" y1="12" x2="21" y2="12" />
			<line x1="6" y1="18" x2="21" y2="18" />
		</svg>
	</ToggleGroupItem>
</ToggleGroup>
