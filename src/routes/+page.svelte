<script lang="ts">
	import { RainbowButton } from '$lib/inspira';
</script>

<svelte:head>
	<title>Inspira Svelte</title>
</svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center px-4">
	<div class="text-center">
		<h1 class="text-4xl font-bold tracking-tight sm:text-6xl">Inspira Svelte</h1>
		<p class="mt-4 text-lg text-muted-foreground">
			Beautiful UI components ported from InspiraUI to Svelte 5.
		</p>
		<div class="mt-8">
			<RainbowButton href="/demo">Browse Components</RainbowButton>
		</div>
	</div>
</div>
