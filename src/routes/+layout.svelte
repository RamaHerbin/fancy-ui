<script lang="ts">
	import './layout.css';
	import AnimatedFavicon from '$lib/components/AnimatedFavicon.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';

	let { children } = $props();
</script>

<AnimatedFavicon />
<ThemeToggle />
{@render children()}
