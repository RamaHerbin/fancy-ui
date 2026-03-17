<script lang="ts">
	import "./layout.css";
	import AnimatedFavicon from "$lib/components/AnimatedFavicon.svelte";

	let { children } = $props();
</script>

<svelte:head>
	<link rel="me" href="https://github.com/RamaHerbin" />
</svelte:head>

<AnimatedFavicon />
{@render children()}
