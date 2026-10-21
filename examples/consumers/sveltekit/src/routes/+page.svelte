<script lang="ts">
	import { onMount } from "svelte";
	import {
		BorderBeam,
		Button,
		Dialog,
		FluidCursor,
		Input,
		RainbowButton,
		Select,
	} from "fancy-ui-svelte";

	let clicks = $state(0);
	let dialogOpen = $state(false);
	let fruit = $state("");
	let name = $state("");
	// Set once Svelte has hydrated the server markup: the smoke waits for it
	// before clicking, so a click can never land on a not-yet-interactive button.
	let hydrated = $state(false);
	onMount(() => {
		hydrated = true;
	});
</script>

<main
	class="bg-background text-foreground mx-auto flex max-w-xl flex-col gap-6 p-8"
	data-hydrated={hydrated ? "true" : undefined}
>
	<h1 class="text-2xl font-semibold">fancy-ui-svelte consumer</h1>

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
			<Button data-testid="open-dialog" variant="outline">Open dialog</Button>
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
</main>
