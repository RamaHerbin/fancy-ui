"use client";

import { useState } from "react";
import {
	BorderBeam,
	Button,
	Dialog,
	FluidCursor,
	Input,
	RainbowButton,
	Select,
} from "fancy-ui-react";

const frameworks = [
	{ value: "svelte", label: "Svelte 5" },
	{ value: "react", label: "React" },
	{ value: "vue", label: "Vue" },
];

export function Demo() {
	const [clicks, setClicks] = useState(0);
	const [open, setOpen] = useState(false);
	const [framework, setFramework] = useState("react");
	const [name, setName] = useState("");

	return (
		<div className="flex flex-col gap-6">
			<section className="flex flex-wrap items-center gap-3">
				<Button data-testid="button">Primary button</Button>
				<RainbowButton data-testid="rainbow" onClick={() => setClicks((n) => n + 1)}>
					Rainbow
				</RainbowButton>
				<p data-testid="clicks">clicks: {clicks}</p>
			</section>

			<section className="flex flex-wrap items-center gap-3">
				<Input
					aria-label="Name"
					placeholder="Your name"
					value={name}
					onValueChange={setName}
				/>
				<Select
					options={frameworks}
					value={framework}
					onValueChange={setFramework}
					label="Framework"
					className="w-[220px]"
				/>
			</section>

			<section>
				<Dialog
					open={open}
					onOpenChange={setOpen}
					trigger={<Button variant="outline">Open dialog</Button>}
					title="Consumer dialog"
					description="Opens and closes with the keyboard."
				>
					<p>Dialog body</p>
				</Dialog>
			</section>

			<section className="relative overflow-hidden rounded-xl border p-8" data-testid="beam-card">
				<p>A card with a border beam.</p>
				<BorderBeam />
			</section>

			<section className="relative h-48 overflow-hidden rounded-xl border" data-testid="fluid">
				<FluidCursor contained />
			</section>
		</div>
	);
}
