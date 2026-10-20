// Mirrors src/lib/components/docs/examples/sound/BasicUsage.svelte (the Sound Lab).
import type { ReactNode } from "react";
import {
	Button,
	CopyButton,
	Slider,
	SoundToggle,
	Switch,
	Toggle,
	useSound,
	useSoundFeedback,
	type SoundCue,
} from "fancy-ui-react";

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

function toggleChangeCue(event: Event): SoundCue {
	const checked = (event.currentTarget as HTMLInputElement).checked;
	return checked ? "toggle-on" : "toggle-off";
}

function pressedToggleCue(event: Event): SoundCue {
	const button = (event.currentTarget as HTMLElement).querySelector("[aria-pressed]");
	return button?.getAttribute("aria-pressed") === "true" ? "toggle-off" : "toggle-on";
}

function Feedback({
	on,
	children,
}: {
	on: Record<string, SoundCue | ((event: Event) => SoundCue)>;
	children: ReactNode;
}) {
	const ref = useSoundFeedback({ on });
	return <span ref={ref}>{children}</span>;
}

export default function Scenario() {
	const sound = useSound();

	let statusText: string;
	if (sound.status.engine === "unsupported") statusText = "This browser has no Web Audio support.";
	else if (!sound.enabled) statusText = "Sound is off. Switch it on to audition the cues.";
	else if (sound.status.engine === "suspended" || sound.status.engine === "blocked")
		statusText = "The browser paused audio. Any Play button resumes it.";
	else statusText = `Sound on · ${Math.round(sound.volume * 100)}%`;

	return (
		<div data-sound-lab className="w-full max-w-3xl text-left">
			<style>{`
.ft-sound-lab-card {
	--ft-sound-lab-accent: var(--ft-accent, light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75)));
}
.ft-sound-lab-card[data-played="true"] {
	box-shadow: 0 0 0 2px color-mix(in oklab, var(--ft-sound-lab-accent) 40%, transparent);
}
@media (prefers-reduced-motion: no-preference) {
	.ft-sound-lab-card { transition: box-shadow 150ms ease; }
}
`}</style>
			<div className="flex flex-wrap items-center gap-4">
				<SoundToggle showLabel />

				<p className="text-muted-foreground flex items-center gap-2 text-sm">
					<span>{statusText}</span>
					<span className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
						{sound.status.engine}
					</span>
				</p>

				<div className="flex w-full flex-col gap-1 sm:ml-auto sm:w-48">
					<div className="flex items-center justify-between text-xs">
						<span className="text-foreground font-medium">Volume</span>
						<span className="text-muted-foreground font-mono">
							{Math.round(sound.volume * 100)}%
						</span>
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

			<div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{CUES.map((c) => (
					<div
						key={c.cue}
						className="ft-sound-lab-card border-border bg-card rounded-lg border p-3"
						data-played={sound.status.lastCue === c.cue ? "true" : undefined}
					>
						<div className="flex items-center justify-between gap-2">
							<span className="text-sm font-medium">{c.label}</span>
							<Button
								size="sm"
								variant="outline"
								label={`Play ${c.cue}`}
								disabled={!sound.enabled}
								onClick={() => sound.play(c.cue)}
							>
								Play
							</Button>
						</div>
						<p className="text-muted-foreground mt-2 text-xs">
							<span className="text-foreground font-medium">Use</span> {c.use}
						</p>
						<p className="text-muted-foreground text-xs">
							<span className="text-foreground font-medium">Avoid</span> {c.avoid}
						</p>
					</div>
				))}
			</div>

			<div className="mt-6">
				<p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
					Try it live
				</p>
				<div className="border-border bg-card mt-3 flex flex-wrap items-center gap-3 rounded-lg border p-4">
					<Feedback on={{ pointerenter: "hover", click: "press" }}>
						<Button variant="outline" size="sm">
							Hover + press
						</Button>
					</Feedback>

					<Feedback on={{ click: pressedToggleCue }}>
						<Toggle label="Pin">📌</Toggle>
					</Feedback>

					<Feedback on={{ change: toggleChangeCue }}>
						<Switch label="Notify" />
					</Feedback>

					<Feedback on={{ click: "copy" }}>
						<CopyButton value="npm install fancy-ui-svelte" />
					</Feedback>

					<Feedback on={{ click: "success" }}>
						<Button variant="ghost" size="sm">
							Succeed
						</Button>
					</Feedback>

					<Feedback on={{ click: "error" }}>
						<Button variant="ghost" size="sm">
							Fail
						</Button>
					</Feedback>
				</div>
			</div>
		</div>
	);
}
