<script lang="ts">
	import {
		BorderBeam,
		Button,
		Dialog,
		FluidCursor,
		Input,
		RainbowButton,
		Select,
	} from "fancy-ui-svelte";
	import Cameleon from "consumer:cameleon";

	let clicks = $state(0);
	let dialogOpen = $state(false);
	let fruit = $state("");
	let name = $state("");
</script>

<main class="bg-background text-foreground mx-auto flex max-w-xl flex-col gap-6 p-8">
	<h1 class="text-2xl font-semibold">fancy-ui-svelte consumer (Svelte + Vite)</h1>

	<div class="flex flex-wrap items-center gap-3">
		<Button data-testid="button">Primary</Button>
		<RainbowButton data-testid="rainbow" onclick={() => clicks++}>Rainbow</RainbowButton>
		<span data-testid="clicks">clicks: {clicks}</span>
	</div>

	<Input placeholder="Your name" aria-label="Name" bind:value={name} />

	<Select
		label="Fruit"
		placeholder="Pick a fruit"
		bind:value={fruit}
		options={[
			{ value: "apple", label: "Apple" },
			{ value: "pear", label: "Pear" },
		]}
	/>

	<Dialog bind:open={dialogOpen} title="Hello" description="A dialog from the packed tarball.">
		{#snippet trigger()}
			<Button variant="outline">Open dialog</Button>
		{/snippet}
		<p>Dialog body</p>
	</Dialog>

	<div class="relative overflow-hidden rounded-xl border p-6">
		Light effect
		<BorderBeam />
	</div>

	<div class="relative h-48 overflow-hidden rounded-xl border" data-testid="fluid">
		<FluidCursor contained />
	</div>

	<Cameleon />
</main>
