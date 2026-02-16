<script lang="ts">
	import NavAnchor from '$lib/portfolio/NavAnchor.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div style="font-family: 'Bricolage Grotesque', sans-serif;">
	<NavAnchor />
	{@render children()}
</div>
