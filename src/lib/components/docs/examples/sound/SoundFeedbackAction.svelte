<script lang="ts">
	import { Switch } from "$lib/fancy-ui/switch";
	import {
		SoundToggle,
		soundFeedback,
		type SoundFeedbackOptions,
	} from "$lib/fancy-ui/sound/index.js";

	let hoverEnabled = $state(true);

	// Rebuilding the whole options object on every change is what exercises
	// the action's own `update()` path — swapping the event map at runtime,
	// not just its resolved cue.
	const feedbackOptions = $derived<SoundFeedbackOptions>(
		hoverEnabled ? { on: { click: "press", pointerenter: "hover" } } : { on: { click: "press" } }
	);
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-wrap items-center gap-3">
		<SoundToggle size="sm" showLabel label="Sound for the action demo" />
		<span class="text-muted-foreground text-sm">Turn sound on, then try the controls below.</span>
	</div>

	<Switch bind:checked={hoverEnabled} label="Also play a hover cue" />

	<div class="flex flex-wrap items-center gap-5">
		<button
			type="button"
			use:soundFeedback={feedbackOptions}
			class="border-border bg-background hover:bg-accent hover:text-accent-foreground h-9 rounded-md border px-3 text-sm transition-colors"
		>
			Plain button
		</button>

		<button
			type="button"
			use:soundFeedback={feedbackOptions}
			class="text-foreground text-sm underline underline-offset-4"
		>
			Link-styled button
		</button>

		<label class="flex items-center gap-2 text-sm">
			<span class="text-muted-foreground">Scrub</span>
			<input
				type="range"
				min="0"
				max="100"
				use:soundFeedback={{ on: { input: "tick" } }}
				class="h-1 w-32"
			/>
		</label>
	</div>
</div>
