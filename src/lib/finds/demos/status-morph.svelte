<script lang="ts">
	import type { PlaygroundValues } from "$lib/finds/types.js";
	import { StatusMorph } from "$lib/fancy-ui/status-morph";

	type Status = "idle" | "loading" | "success" | "error";

	let { values }: { values: PlaygroundValues } = $props();

	let morphState = $state<Status>("idle");
	let failNext = $state(false);

	async function run() {
		if (morphState === "loading") return;
		morphState = "loading";
		await new Promise((resolve) => setTimeout(resolve, 900));
		morphState = failNext ? "error" : "success";
		failNext = !failNext;
	}
</script>

<div class="flex h-full w-full flex-col items-center justify-center gap-6 p-6">
	<div class="text-foreground flex items-center gap-3 text-3xl">
		<StatusMorph
			bind:state={morphState}
			resetAfter={values.resetAfter as number}
			tone={values.tone as "current" | "semantic"}
		/>
	</div>
	<button
		type="button"
		onclick={run}
		class="bg-card border-border text-foreground hover:bg-muted rounded-full border px-4 py-1.5 text-sm transition-colors"
	>
		Save changes
	</button>
</div>
