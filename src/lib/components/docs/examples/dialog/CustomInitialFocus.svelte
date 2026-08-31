<script lang="ts">
	import { Dialog } from "$lib/fancy-ui/dialog";
	import { Button } from "$lib/fancy-ui/button";

	let open = $state(false);
	let name = $state("Untitled project");
	let nameInput: HTMLInputElement | null = $state(null);
</script>

{#snippet trigger()}
	<Button variant="outline">Rename project</Button>
{/snippet}

<!--
	Without initialFocus, the first focusable descendant would be the ✕ close
	button — a reasonable default, but not what a rename dialog wants. Passing
	the input's own element sends focus straight to it instead.
-->
<Dialog sound bind:open initialFocus={nameInput} {trigger} title="Rename project">
	<input
		bind:this={nameInput}
		bind:value={name}
		type="text"
		class="border-input bg-background focus-visible:ring-ring/50 focus-visible:border-ring w-full rounded-lg border px-3 py-2 text-[13px] outline-none focus-visible:ring-2"
	/>
	{#snippet footer()}
		<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
		<Button onclick={() => (open = false)}>Save</Button>
	{/snippet}
</Dialog>
