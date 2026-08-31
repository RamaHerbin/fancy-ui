<script lang="ts">
	import { Toggle, type ToggleVariant } from "$lib/fancy-ui/toggle";

	const variants: ToggleVariant[] = ["ghost", "outline"];
</script>

<div class="flex flex-wrap items-center gap-6">
	{#each variants as variant (variant)}
		<div class="flex items-center gap-2">
			<Toggle sound {variant} label={`${variant}, resting`}>
				<strong>B</strong>
			</Toggle>
			<Toggle sound {variant} pressed label={`${variant}, pressed`}>
				<strong>B</strong>
			</Toggle>
		</div>
	{/each}
</div>
