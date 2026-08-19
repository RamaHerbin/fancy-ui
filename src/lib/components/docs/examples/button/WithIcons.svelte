<script lang="ts">
	import { Button } from "$lib/fancy-ui/button";
	import Plus from "@lucide/svelte/icons/plus";
	import ArrowRight from "@lucide/svelte/icons/arrow-right";
</script>

{#snippet plusIcon()}
	<Plus class="size-4" />
{/snippet}

{#snippet arrowIcon()}
	<ArrowRight class="size-4" />
{/snippet}

<div class="flex flex-wrap items-center gap-3">
	<Button iconStart={plusIcon}>New project</Button>
	<Button variant="outline" iconEnd={arrowIcon}>Continue</Button>
</div>
