<script lang="ts">
	import { CopyButton } from "$lib/fancy-ui/copy-button";
	import type { ButtonVariant } from "$lib/fancy-ui/button";

	const variants: ButtonVariant[] = ["outline", "ghost", "secondary", "accent"];
</script>

<div class="flex flex-wrap items-center gap-3">
	{#each variants as variant}
		<CopyButton sound value="npm install fancy-ui-svelte" {variant} />
	{/each}
</div>
