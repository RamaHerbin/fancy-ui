<script lang="ts">
	import { Button } from "$lib/fancy-ui/button";
	import { Toggle } from "$lib/fancy-ui/toggle";
	import { Switch } from "$lib/fancy-ui/switch";
	import { Slider } from "$lib/fancy-ui/slider";
	import { CopyButton } from "$lib/fancy-ui/copy-button";
	import { SoundToggle, sound, soundFeedback, type SoundCue } from "$lib/fancy-ui/sound/index.js";

	// One row per cue, in the same order SOUND_CUES defines them. "Use"/"Avoid"
	// stay short enough to scan a grid of eleven of these at once.
	const CUES: { cue: SoundCue; label: string; use: string; avoid: string }[] = [
		{
			cue: "hover",
			label: "Hover",
			use: "Dense pointer UI: menus, docks, toolbars.",
			avoid: "Lists and anything that scrolls — it's rate-limited and silent on touch.",
		},
		{
			cue: "press",
			label: "Press",
			use: "Buttons and primary actions.",
			avoid: "Pairing with a toggle cue on the same control.",
		},
		{
			cue: "toggle-on",
			label: "Toggle on",
			use: "Switches, checkboxes, pressed toggles turning on.",
			avoid: "Navigation.",
		},
		{
			cue: "toggle-off",
			label: "Toggle off",
			use: "Switches, checkboxes, pressed toggles turning off.",
			avoid: "Navigation.",
		},
		{
			cue: "open",
			label: "Open",
			use: "Menus, dialogs, popovers opening.",
			avoid: "Tooltips and hover cards.",
		},
		{
			cue: "close",
			label: "Close",
			use: "Menus, dialogs, popovers closing.",
			avoid: "Tooltips and hover cards.",
		},
		{
			cue: "select",
			label: "Select",
			use: "Committing a choice in a list or menu.",
			avoid: "Each arrow-key step — that's tick.",
		},
		{
			cue: "success",
			label: "Success",
			use: "The outcome of an async action.",
			avoid: "Per-keystroke validation.",
		},
		{
			cue: "error",
			label: "Error",
			use: "The outcome of an async action.",
			avoid: "Per-keystroke validation.",
		},
		{
			cue: "tick",
			label: "Tick",
			use: "Steppers, sliders, scroll-snap — the only cue meant to repeat quickly.",
			avoid: "Anything louder than near-silent; it fires often.",
		},
		{
			cue: "copy",
			label: "Copy",
			use: "Clipboard confirmations, once per copy.",
			avoid: "Re-firing for the same copy without a new user action.",
		},
	];

	// Copy by engine/enabled state. Order matters: an unsupported browser wins
	// over every other state (the toggle itself is forced disabled for the
	// same reason), then the plain off/on/suspended cases.
	const statusText = $derived.by(() => {
		const status = sound.status;
		if (status.engine === "unsupported") return "This browser has no Web Audio support.";
		if (!sound.enabled) return "Sound is off. Switch it on to audition the cues.";
		if (status.engine === "suspended" || status.engine === "blocked")
			return "The browser paused audio. Any Play button resumes it.";
		return `Sound on · ${Math.round(sound.volume * 100)}%`;
	});

	function toggleChangeCue(event: Event) {
		const checked = (event.currentTarget as HTMLInputElement).checked;
		return checked ? "toggle-on" : "toggle-off";
	}

	// The click reaches this wrapper after the Toggle's own handler ran but
	// before Svelte has flushed the DOM, so aria-pressed still shows the OLD
	// state: "false" means it is turning on.
	function pressedToggleCue(event: Event) {
		const button = (event.currentTarget as HTMLElement).querySelector("[aria-pressed]");
		return button?.getAttribute("aria-pressed") === "true" ? "toggle-off" : "toggle-on";
	}
</script>

<div data-sound-lab class="w-full max-w-3xl text-left">
	<!-- Control bar. No aria-live: this example is mounted twice on the page
	     (the docs preview and the examples list), and a live region would
	     announce the same state change twice. -->
	<div class="flex flex-wrap items-center gap-4">
		<SoundToggle showLabel />

		<p class="text-muted-foreground flex items-center gap-2 text-sm">
			<span>{statusText}</span>
			<span class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">{sound.status.engine}</span>
		</p>

		<div class="flex w-full flex-col gap-1 sm:ml-auto sm:w-48">
			<div class="flex items-center justify-between text-xs">
				<span class="text-foreground font-medium">Volume</span>
				<span class="text-muted-foreground font-mono">{Math.round(sound.volume * 100)}%</span>
			</div>
			<Slider
				value={sound.volume * 100}
				min={0}
				max={100}
				step={5}
				label="Volume"
				disabled={!sound.enabled}
				onValueChange={(v) => sound.setVolume(v / 100)}
			/>
		</div>
	</div>

	<!-- Cue grid -->
	<div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
		{#each CUES as c (c.cue)}
			<!-- A cue is a sound; data-played is the same information for anyone
			     who cannot hear it — the last cue played keeps a visible ring
			     until another replaces it. -->
			<div
				class="ft-sound-lab-card border-border bg-card rounded-lg border p-3"
				data-played={sound.status.lastCue === c.cue ? "true" : undefined}
			>
				<div class="flex items-center justify-between gap-2">
					<span class="text-sm font-medium">{c.label}</span>
					<Button
						size="sm"
						variant="outline"
						label={`Play ${c.cue}`}
						disabled={!sound.enabled}
						onclick={() => sound.play(c.cue)}
					>
						Play
					</Button>
				</div>
				<p class="text-muted-foreground mt-2 text-xs">
					<span class="text-foreground font-medium">Use</span>
					{c.use}
				</p>
				<p class="text-muted-foreground text-xs">
					<span class="text-foreground font-medium">Avoid</span>
					{c.avoid}
				</p>
			</div>
		{/each}
	</div>

	<!-- Try it live: wired only through use:soundFeedback, never the `sound`
	     prop those belong to the component-integration examples. -->
	<div class="mt-6">
		<p class="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Try it live</p>
		<div class="border-border bg-card mt-3 flex flex-wrap items-center gap-3 rounded-lg border p-4">
			<!-- Hover is opt-in: the default map is press only. -->
			<span use:soundFeedback={{ on: { pointerenter: "hover", click: "press" } }}>
				<Button variant="outline" size="sm">Hover + press</Button>
			</span>

			<span use:soundFeedback={{ on: { click: pressedToggleCue } }}>
				<Toggle label="Pin">📌</Toggle>
			</span>

			<span use:soundFeedback={{ on: { change: toggleChangeCue } }}>
				<Switch label="Notify" />
			</span>

			<span use:soundFeedback={{ on: { click: "copy" } }}>
				<CopyButton value="npm install fancy-ui-svelte" />
			</span>

			<span use:soundFeedback={{ on: { click: "success" } }}>
				<Button variant="ghost" size="sm">Succeed</Button>
			</span>

			<span use:soundFeedback={{ on: { click: "error" } }}>
				<Button variant="ghost" size="sm">Fail</Button>
			</span>
		</div>
	</div>
</div>

<style>
	.ft-sound-lab-card {
		--ft-sound-lab-accent: var(
			--ft-accent,
			light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
		);
	}
	.ft-sound-lab-card[data-played="true"] {
		box-shadow: 0 0 0 2px color-mix(in oklab, var(--ft-sound-lab-accent) 40%, transparent);
	}
	@media (prefers-reduced-motion: no-preference) {
		.ft-sound-lab-card {
			transition: box-shadow 150ms ease;
		}
	}
</style>
