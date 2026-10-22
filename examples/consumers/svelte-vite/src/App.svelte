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
	import FirstComponent from "./snippets/FirstComponent.svelte";
	import Usage from "./snippets/Usage.svelte";
	import "./snippets/types";
	import Cameleon from "./Cameleon.svelte";

	let clicks = $state(0);
	let dialogOpen = $state(false);
	let fruit = $state("");
	let name = $state("");
	let buttonClicks = $state(0);
	let dark = $state(false);
	let dialogEvents = $state<boolean[]>([]);
</script>

<div data-testid="theme-root" class:dark>
	<main class="bg-background text-foreground mx-auto flex max-w-xl flex-col gap-6 p-8">
		<h1 class="text-2xl font-semibold">fancy-ui-svelte consumer (Svelte + Vite)</h1>

		<div class="flex flex-wrap items-center gap-3">
			<Button data-testid="button" onclick={() => buttonClicks++}>Primary</Button>
			<span data-testid="button-clicks">button clicks: {buttonClicks}</span>
			<Button data-testid="theme-toggle" variant="outline" onclick={() => (dark = !dark)}>
				Toggle dark
			</Button>
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

		<Dialog
			bind:open={dialogOpen}
			onOpenChange={(open) => dialogEvents.push(open)}
			title="Hello"
			description="A dialog from the packed tarball."
		>
			{#snippet trigger()}
				<Button data-testid="open-dialog" variant="outline">Open dialog</Button>
			{/snippet}
			<p>Dialog body</p>
		</Dialog>

		<span data-testid="dialog-events">dialog events: {dialogEvents.join(",") || "none"}</span>

		<section data-testid="snippet-first"><FirstComponent /></section>
		<section data-testid="snippet-usage"><Usage /></section>

		<div class="relative overflow-hidden rounded-xl border p-6">
			Light effect
			<BorderBeam />
		</div>

		<div class="relative h-48 overflow-hidden rounded-xl border" data-testid="fluid">
			<FluidCursor contained />
		</div>

		<Cameleon />
	</main>
</div>
