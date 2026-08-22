<script lang="ts">
	import { StatusMorph } from "$lib/fancy-ui/status-morph";
	import { Button } from "$lib/fancy-ui/button";

	type Status = "idle" | "loading" | "success" | "error";

	let state = $state<Status>("idle");
</script>

<div class="flex w-full flex-col items-center gap-6 p-6">
	<!-- Standalone usage — nothing hides StatusMorph's loading phase the way
	     Button's own spinner does, so the full ring → check/cross morph plays
	     every time, not just the settle. -->
	<div class="text-foreground flex items-center gap-3 text-3xl">
		<StatusMorph bind:state />
		<span class="text-muted-foreground text-sm">Sync status</span>
	</div>

	<div class="flex flex-wrap justify-center gap-2">
		<Button size="sm" variant="outline" onclick={() => (state = "loading")}>Loading</Button>
		<Button size="sm" variant="outline" onclick={() => (state = "success")}>Success</Button>
		<Button size="sm" variant="outline" onclick={() => (state = "error")}>Error</Button>
		<Button size="sm" variant="ghost" onclick={() => (state = "idle")}>Reset</Button>
	</div>
</div>
