<script lang="ts">
	import { Button } from "$lib/fancy-ui/button";
	import { StatusMorph } from "$lib/fancy-ui/status-morph";
	import { Switch } from "$lib/fancy-ui/switch";

	type Status = "idle" | "loading" | "success" | "error";

	let status = $state<Status>("idle");
	let failNext = $state(false);

	// Composition recipe from the README, frozen: Button's own spinner covers the
	// entire loading phase (iconStart never mounts until loading is already false),
	// so StatusMorph only ever plays its check-pop / error-shake here, not the full
	// ring→check morph — that's reserved for standalone usage (see the Standalone
	// example).
	async function save() {
		status = "loading";
		await new Promise((resolve) => setTimeout(resolve, 1200));
		status = failNext ? "error" : "success";
	}
</script>

{#snippet icon()}
	<StatusMorph bind:state={status} />
{/snippet}

<div class="flex w-full flex-col items-center gap-6 p-6">
	<Button loading={status === "loading"} iconStart={icon} onclick={save}>Save changes</Button>

	<Switch bind:checked={failNext}>Fail next save</Switch>
</div>
