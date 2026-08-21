<script lang="ts">
	import { Button } from "$lib/fancy-ui/button";
	import { SoundToggle, sound } from "$lib/fancy-ui/sound/index.js";

	let saving = $state(false);
	let attempts = 0;
	let outcome = $state<"idle" | "success" | "error">("idle");

	async function save() {
		saving = true;
		outcome = "idle";
		// The outcome cue plays after an await, so unlock here — inside the click
		// that started the work. On a reload with sound already enabled there is
		// no AudioContext yet, and the transient user activation that lets one be
		// created may be gone by the time the promise settles.
		if (sound.enabled) void sound.unlock();
		await new Promise((resolve) => setTimeout(resolve, 600));
		attempts += 1;
		const ok = attempts % 2 === 1;
		outcome = ok ? "success" : "error";
		// sound.play() is a no-op while sound is off — this call site never
		// branches on the preference itself, on or off.
		sound.play(ok ? "success" : "error");
		saving = false;
	}
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-wrap items-center gap-3">
		<SoundToggle size="sm" showLabel label="Sound for programmatic play" />
		<span class="text-muted-foreground text-sm">
			Turn sound on to hear the outcome, or leave it off to see play() do nothing.
		</span>
	</div>

	<div class="flex items-center gap-3">
		<Button loading={saving} onclick={save}>
			{saving ? "Saving…" : "Save changes"}
		</Button>
		<!-- The outcome is always shown here too — audio is a confirmation,
		     never the only carrier of the result. -->
		{#if outcome !== "idle"}
			<span class={outcome === "success" ? "text-foreground text-sm" : "text-destructive text-sm"}>
				{outcome === "success" ? "Saved." : "Failed to save."}
			</span>
		{/if}
	</div>
</div>
