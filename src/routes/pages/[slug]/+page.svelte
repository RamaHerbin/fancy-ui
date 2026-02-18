<script lang="ts">
	import { PageRenderer } from '$lib/builder/renderer/index.js';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.page.meta.title}</title>
	{#if data.page.meta.description}
		<meta name="description" content={data.page.meta.description} />
	{/if}
</svelte:head>

<PageRenderer page={data.page} />
