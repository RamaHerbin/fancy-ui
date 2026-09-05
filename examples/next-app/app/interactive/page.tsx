"use client";

import { useState } from "react";
import {
	Button,
	Checkbox,
	Combobox,
	Dialog,
	Input,
	Label,
	Select,
	Slider,
	SoundToggle,
	Switch,
	Toaster,
	Toggle,
	dismissToast,
	toast,
	useSoundEnabled,
	type ComboboxOption,
	type SelectOption,
} from "fancy-ui-react";

/**
 * CLIENT COMPONENT — "use client" is on THIS file, not inherited from the package.
 *
 * The other two pages prove the library survives the server. This one proves the
 * other half: once a consumer opts into the client, the components behave as
 * ordinary controlled React — state in the page, values down, callbacks up. The
 * whole subtree hydrates, so anything that rendered differently on the server
 * than on the client would surface here as a hydration error.
 *
 * Two API shapes worth knowing before reading the JSX:
 *
 *  - `Button` spells its handler `onClick`, like every other component here and
 *    like React itself. The Svelte source calls it `onclick`; the port renames
 *    it, because a lowercase handler on a React component reads as a typo and
 *    the whole point of the prop is that a React consumer reaches for it first.
 *  - The bound props are `onValueChange` / `onCheckedChange` / `onPressedChange`,
 *    the React spelling of the Svelte side's `bind:value` / `bind:checked`.
 */

const RENDER_MODES: SelectOption[] = [
	{ value: "rsc", label: "Server Component" },
	{ value: "csr", label: "Client Component" },
	{ value: "static", label: "Static prerender" },
	{ value: "edge", label: "Edge runtime", disabled: true },
];

const COMPONENT_BUCKETS: ComboboxOption[] = [
	{ value: "css", label: "CSS-only effects" },
	{ value: "canvas", label: "Canvas graphics" },
	{ value: "webgl", label: "WebGL" },
	{ value: "motion", label: "Motion" },
	{ value: "form", label: "Headless & form" },
	{ value: "overlay", label: "Overlays" },
	{ value: "sound", label: "Sound engine" },
];

export default function InteractivePage() {
	const [dialogOpen, setDialogOpen] = useState(false);
	const [mode, setMode] = useState("rsc");
	const [bucket, setBucket] = useState("");
	const [notifications, setNotifications] = useState(true);
	const [analytics, setAnalytics] = useState(false);
	const [bold, setBold] = useState(false);
	const [volume, setVolume] = useState(60);
	const [projectName, setProjectName] = useState("next-app");
	const [lastToastId, setLastToastId] = useState("");

	// Reads the sound controller's live preference — the same store `SoundToggle`
	// writes to, so the two stay in step without the page wiring them together.
	const soundEnabled = useSoundEnabled();

	return (
		<main className="min-h-screen bg-neutral-900 p-6 text-neutral-100">
			<header className="mb-6 max-w-3xl">
				<h1 className="text-xl font-semibold">Stateful use, from the client</h1>
				<p className="mt-2 text-sm text-neutral-400">
					Every control below is controlled by this page&rsquo;s own state. The{" "}
					<code>sound</code> prop is opt-in per component and only ever audible once the
					sound preference is enabled.
				</p>
				<nav className="mt-4 flex gap-4 text-sm">
					<a className="text-blue-400 underline" href="/">
						/
					</a>
					<a className="text-blue-400 underline" href="/cameleon">
						/cameleon
					</a>
				</nav>
			</header>

			<div className="grid max-w-5xl gap-4 lg:grid-cols-2">
				{/* ---------- Overlay driven by page state ---------- */}
				<section className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
					<h2 className="mb-3 font-mono text-sm">Dialog</h2>
					<div className="flex flex-wrap items-center gap-3">
						<Button variant="primary" size="sm" onClick={() => setDialogOpen(true)}>
							Open dialog
						</Button>
						<span className="font-mono text-xs text-neutral-500">
							open: {String(dialogOpen)}
						</span>
					</div>

					<Dialog
						open={dialogOpen}
						onOpenChange={setDialogOpen}
						title="Controlled from the page"
						description="Escape, the close button and an outside click all report back through onOpenChange."
						footer={
							<div className="flex justify-end gap-2">
								<Button variant="ghost" size="sm" onClick={() => setDialogOpen(false)}>
									Cancel
								</Button>
								<Button
									variant="primary"
									size="sm"
									sound
									onClick={() => {
										setDialogOpen(false);
										setLastToastId(
											toast({
												title: "Saved",
												description: `Render mode set to "${mode}".`,
												variant: "success",
											})
										);
									}}
								>
									Save
								</Button>
							</div>
						}
					>
						<p className="text-sm">
							The panel portals to <code>&lt;body&gt;</code> on open and unmounts on close,
							so none of it exists in the prerendered HTML.
						</p>
					</Dialog>
				</section>

				{/* ---------- Toast ---------- */}
				<section className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
					<h2 className="mb-3 font-mono text-sm">Toast</h2>
					<div className="flex flex-wrap items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() =>
								setLastToastId(
									toast({
										title: "Build finished",
										description: "34 components prerendered.",
										variant: "success",
									})
								)
							}
						>
							Success
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() =>
								setLastToastId(
									toast({
										title: "Hydration mismatch",
										description: "Nothing may differ between a server render and its hydration.",
										variant: "error",
										action: {
											label: "Retry",
											onClick: () => {
												toast({ title: "Retrying", variant: "loading" });
											},
										},
									})
								)
							}
						>
							Error + action
						</Button>
						<Button
							variant="ghost"
							size="sm"
							disabled={lastToastId === ""}
							onClick={() => {
								dismissToast(lastToastId);
								setLastToastId("");
							}}
						>
							Dismiss last
						</Button>
					</div>
					<p className="mt-3 font-mono text-xs text-neutral-500">
						last id: {lastToastId === "" ? "—" : lastToastId}
					</p>
				</section>

				{/* ---------- Closed-set pickers ---------- */}
				<section className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
					<h2 className="mb-3 font-mono text-sm">Select &amp; Combobox</h2>
					<div className="flex flex-col gap-4">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="render-mode">Render mode</Label>
							<Select
								id="render-mode"
								options={RENDER_MODES}
								value={mode}
								onValueChange={setMode}
								placeholder="Pick a mode"
								sound
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="bucket">Component bucket</Label>
							<Combobox
								id="bucket"
								options={COMPONENT_BUCKETS}
								value={bucket}
								onValueChange={setBucket}
								placeholder="Type to filter…"
								emptyMessage="No bucket matches"
							/>
						</div>
					</div>
				</section>

				{/* ---------- Toggles, with the opt-in sound cue ---------- */}
				<section className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
					<h2 className="mb-3 font-mono text-sm">Switch, Checkbox, Toggle</h2>
					<div className="flex flex-col gap-3">
						{/* `sound` is the opt-in cue: audible only once the preference below is on. */}
						<Switch checked={notifications} onCheckedChange={setNotifications} sound>
							Notifications
						</Switch>
						<Checkbox checked={analytics} onCheckedChange={setAnalytics} sound>
							Share anonymous usage
						</Checkbox>
						<div className="flex items-center gap-3">
							<Toggle label="Bold" pressed={bold} onPressedChange={setBold}>
								B
							</Toggle>
							<span className="font-mono text-xs text-neutral-500">
								pressed: {String(bold)}
							</span>
						</div>
					</div>
				</section>

				{/* ---------- Text + range ---------- */}
				<section className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
					<h2 className="mb-3 font-mono text-sm">Input &amp; Slider</h2>
					<div className="flex flex-col gap-4">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="project">Project</Label>
							<Input id="project" value={projectName} onValueChange={setProjectName} />
						</div>
						<Slider
							value={volume}
							onValueChange={setVolume}
							min={0}
							max={100}
							step={5}
							label="Volume"
							showValue
							showBounds
						/>
					</div>
				</section>

				{/* ---------- Sound preference ---------- */}
				<section className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
					<h2 className="mb-3 font-mono text-sm">Sound engine</h2>
					<div className="flex flex-wrap items-center gap-3">
						<SoundToggle
							showLabel
							onEnabledChange={(enabled) => {
								toast({
									title: enabled ? "Sound on" : "Sound off",
									variant: "info",
									duration: 2000,
								});
							}}
						/>
						<span className="font-mono text-xs text-neutral-500">
							useSoundEnabled(): {String(soundEnabled)}
						</span>
					</div>
					<p className="mt-3 text-xs text-neutral-500">
						The preference is read through <code>useSoundEnabled()</code>, whose server
						snapshot is the off state — which is what keeps this subtree hydrating cleanly
						even though the real value lives in browser storage.
					</p>
				</section>
			</div>

			{/* Live state, so a reader can see the page really is stateful. */}
			<pre className="mt-6 max-w-5xl overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-950 p-4 font-mono text-xs text-neutral-400">
				{JSON.stringify(
					{ dialogOpen, mode, bucket, notifications, analytics, bold, volume, projectName },
					null,
					2
				)}
			</pre>

			{/* The viewport the toast store renders into. Portals to <body>. */}
			<Toaster position="bottom-right" />
		</main>
	);
}
