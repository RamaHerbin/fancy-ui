<script lang="ts">
	import { RainbowButton } from "$lib/fancy-ui";
	import ThemeToggle from "$lib/components/ThemeToggle.svelte";
</script>

<svelte:head>
	<title>FancyUI</title>
</svelte:head>

<div class="fixed top-4 right-4 z-50">
	<ThemeToggle />
</div>

<div class="flex min-h-screen flex-col items-center justify-center px-4">
	<div class="text-center">
		<h1 class="text-4xl font-bold tracking-tight sm:text-6xl">FancyUI</h1>
		<p class="text-muted-foreground mt-4 text-lg">
			Beautiful UI components implemented from FancyUI to Svelte 5.
		</p>
		<div class="mt-8">
			<RainbowButton href="/demo">Browse Components</RainbowButton>
		</div>
	</div>
</div>
