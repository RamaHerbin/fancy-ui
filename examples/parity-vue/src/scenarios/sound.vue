<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/sound/BasicUsage.svelte (the Sound Lab).
import { computed, useTemplateRef } from "vue";
import {
	Button,
	CopyButton,
	Slider,
	SoundToggle,
	Switch,
	Toggle,
	sound,
	useSoundFeedback,
	type SoundCue,
} from "fancy-ui-vue";

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

const statusText = computed(() => {
	const status = sound.status;
	if (status.engine === "unsupported") return "This browser has no Web Audio support.";
	if (!sound.enabled) return "Sound is off. Switch it on to audition the cues.";
	if (status.engine === "suspended" || status.engine === "blocked")
		return "The browser paused audio. Any Play button resumes it.";
	return `Sound on · ${Math.round(sound.volume * 100)}%`;
});

function toggleChangeCue(event: Event): SoundCue {
	const checked = (event.currentTarget as HTMLInputElement).checked;
	return checked ? "toggle-on" : "toggle-off";
}

function pressedToggleCue(event: Event): SoundCue {
	const button = (event.currentTarget as HTMLElement).querySelector("[aria-pressed]");
	return button?.getAttribute("aria-pressed") === "true" ? "toggle-off" : "toggle-on";
}

const hoverPress = useTemplateRef<HTMLElement>("hoverPress");
const pin = useTemplateRef<HTMLElement>("pin");
const notify = useTemplateRef<HTMLElement>("notify");
const copy = useTemplateRef<HTMLElement>("copy");
const succeed = useTemplateRef<HTMLElement>("succeed");
const fail = useTemplateRef<HTMLElement>("fail");
useSoundFeedback(hoverPress, () => ({ on: { pointerenter: "hover", click: "press" } }));
useSoundFeedback(pin, () => ({ on: { click: pressedToggleCue } }));
useSoundFeedback(notify, () => ({ on: { change: toggleChangeCue } }));
useSoundFeedback(copy, () => ({ on: { click: "copy" } }));
useSoundFeedback(succeed, () => ({ on: { click: "success" } }));
useSoundFeedback(fail, () => ({ on: { click: "error" } }));
</script>

<template>
	<div data-sound-lab class="w-full max-w-3xl text-left">
		<div class="flex flex-wrap items-center gap-4">
			<SoundToggle show-label />

			<p class="text-muted-foreground flex items-center gap-2 text-sm">
				<span>{{ statusText }}</span>
				<span class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">{{
					sound.status.engine
				}}</span>
			</p>

			<div class="flex w-full flex-col gap-1 sm:ml-auto sm:w-48">
				<div class="flex items-center justify-between text-xs">
					<span class="text-foreground font-medium">Volume</span>
					<span class="text-muted-foreground font-mono">{{ Math.round(sound.volume * 100) }}%</span>
				</div>
				<Slider
					:value="sound.volume * 100"
					:min="0"
					:max="100"
					:step="5"
					label="Volume"
					:disabled="!sound.enabled"
					@update:value="(v: number) => sound.setVolume(v / 100)"
				/>
			</div>
		</div>

		<div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			<div
				v-for="c in CUES"
				:key="c.cue"
				class="ft-sound-lab-card border-border bg-card rounded-lg border p-3"
				:data-played="sound.status.lastCue === c.cue ? 'true' : undefined"
			>
				<div class="flex items-center justify-between gap-2">
					<span class="text-sm font-medium">{{ c.label }}</span>
					<Button
						size="sm"
						variant="outline"
						:label="`Play ${c.cue}`"
						:disabled="!sound.enabled"
						@click="sound.play(c.cue)"
					>
						Play
					</Button>
				</div>
				<p class="text-muted-foreground mt-2 text-xs">
					<span class="text-foreground font-medium">Use</span>
					{{ c.use }}
				</p>
				<p class="text-muted-foreground text-xs">
					<span class="text-foreground font-medium">Avoid</span>
					{{ c.avoid }}
				</p>
			</div>
		</div>

		<div class="mt-6">
			<p class="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
				Try it live
			</p>
			<div
				class="border-border bg-card mt-3 flex flex-wrap items-center gap-3 rounded-lg border p-4"
			>
				<span ref="hoverPress"><Button variant="outline" size="sm">Hover + press</Button></span>
				<span ref="pin"><Toggle label="Pin">📌</Toggle></span>
				<span ref="notify"><Switch label="Notify" /></span>
				<span ref="copy"><CopyButton value="npm install fancy-ui-svelte" /></span>
				<span ref="succeed"><Button variant="ghost" size="sm">Succeed</Button></span>
				<span ref="fail"><Button variant="ghost" size="sm">Fail</Button></span>
			</div>
		</div>
	</div>
</template>

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
