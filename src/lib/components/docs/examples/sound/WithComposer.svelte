<script lang="ts">
	import {
		Composer,
		ComposerInput,
		ComposerSubmit,
		ComposerToolbar,
		ComposerModelPicker,
		ComposerCommandMenu,
	} from "$lib/fancy-ui/composer";
	import { SoundToggle } from "$lib/fancy-ui/sound/index.js";
	import type { CommandItemData, ModelOptionData } from "$lib/fancy-ui/_internals/ai-types.js";

	/** Generic tiers, so the fixture says nothing about anyone's product line-up. */
	const MODELS: ModelOptionData[] = [
		{ id: "mini", label: "Mini", badge: "Fast", description: "Short answers, small context." },
		{ id: "pro", label: "Pro", description: "Deeper reasoning, slower." },
	];

	const COMMANDS: CommandItemData[] = [
		{ id: "deploy", label: "/deploy", description: "Ship the current branch" },
		{ id: "tests", label: "/tests", description: "Run the affected suites" },
	];

	let draft = $state("");
	let model = $state("pro");
	let lastSent = $state("");

	function send(payload: { text: string }) {
		lastSent = payload.text;
	}
</script>

<div class="flex w-full max-w-xl flex-col gap-4">
	<div class="flex flex-wrap items-center gap-3">
		<SoundToggle size="sm" showLabel label="Sound for the composer" />
		<span class="text-muted-foreground text-sm">
			Turn sound on, then send a draft, switch the model, or type <code>/</code>.
		</span>
	</div>

	<!-- One `sound` on the root covers every part: sending plays press, the model
	     picker plays open, close and select, the command menu plays select. -->
	<Composer sound bind:value={draft} onSubmit={send}>
		{#snippet children()}
			<ComposerInput placeholder="Ask anything — / for commands" maxRows={4} />
			<ComposerToolbar class="mt-2">
				<ComposerModelPicker models={MODELS} bind:value={model} />
				<div class="flex-1"></div>
				<ComposerSubmit />
			</ComposerToolbar>
			<ComposerCommandMenu trigger="/" items={COMMANDS} />
		{/snippet}
	</Composer>

	<!-- The cue is never the only carrier: what was sent is also written out. -->
	<p class="text-muted-foreground text-sm">
		{lastSent ? `Sent: ${lastSent} · model: ${model}` : `Model: ${model}`}
	</p>
</div>
