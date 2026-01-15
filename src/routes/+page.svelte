<script lang="ts">
	import { RainbowButton } from '$lib/fancy-ui';
</script>

<svelte:head>
	<title>FancyUI</title>
</svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center px-4">
	<div class="text-center">
		<h1 class="text-4xl font-bold tracking-tight sm:text-6xl">FancyUI</h1>
		<p class="mt-4 text-lg text-muted-foreground">
			Beautiful UI components implemented from FancyUI to Svelte 5.
		</p>
		<div class="mt-8">
			<RainbowButton href="/demo">Browse Components</RainbowButton>
		</div>
	</div>
</div>
