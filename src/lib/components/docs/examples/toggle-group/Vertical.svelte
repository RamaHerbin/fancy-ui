<script lang="ts">
	import { ToggleGroup, ToggleGroupItem } from "$lib/fancy-ui/toggle-group";

	let tool = $state("select");
</script>

<ToggleGroup sound bind:value={tool} orientation="vertical" label="Tool">
	<ToggleGroupItem value="select" label="Select">
		<svg
			class="size-4"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
		</svg>
	</ToggleGroupItem>
	<ToggleGroupItem value="pan" label="Pan">
		<svg
			class="size-4"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
			<path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
			<path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
			<path
				d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"
			/>
		</svg>
	</ToggleGroupItem>
	<ToggleGroupItem value="zoom" label="Zoom">
		<svg
			class="size-4"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<circle cx="11" cy="11" r="8" />
			<line x1="21" y1="21" x2="16.65" y2="16.65" />
		</svg>
	</ToggleGroupItem>
</ToggleGroup>
