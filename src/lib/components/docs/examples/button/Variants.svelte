<script lang="ts">
	import { Button } from "$lib/fancy-ui/button";
	import type { ButtonVariant } from "$lib/fancy-ui/button";

	const variants: { variant: ButtonVariant; label: string }[] = [
		{ variant: "primary", label: "Primary" },
		{ variant: "secondary", label: "Secondary" },
		{ variant: "outline", label: "Outline" },
		{ variant: "ghost", label: "Ghost" },
		{ variant: "accent", label: "Accent" },
		{ variant: "destructive", label: "Destructive" },
	];
</script>

<div class="flex flex-wrap items-center gap-3">
	{#each variants as { variant, label } (variant)}
		<Button sound {variant}>{label}</Button>
	{/each}
</div>
