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

export function App() {
	const [clicks, setClicks] = useState(0);
	const [fruit, setFruit] = useState("");
	const [open, setOpen] = useState(false);

	return (
		<main className="mx-auto flex max-w-xl flex-col gap-6 p-8">
			<h1 className="text-2xl font-semibold">fancy-ui-react consumer</h1>

			<div className="flex flex-wrap items-center gap-3">
				<Button data-testid="button">Plain button</Button>
				<RainbowButton data-testid="rainbow" onClick={() => setClicks((n) => n + 1)}>
					Rainbow
				</RainbowButton>
				<span data-testid="clicks">clicks: {clicks}</span>
			</div>

			<Input aria-label="Name" placeholder="Your name" />
			<Select
				label="Fruit"
				placeholder="Pick a fruit"
				value={fruit}
				onValueChange={setFruit}
				options={[
					{ value: "apple", label: "Apple" },
					{ value: "pear", label: "Pear" },
				]}
			/>

			<Dialog
				open={open}
				onOpenChange={setOpen}
				trigger={<Button data-testid="open-dialog">Open dialog</Button>}
				title="Hello"
				description="A dialog from the packed tarball."
			>
				<p>Body</p>
			</Dialog>
			<p data-testid="dialog-state">dialog: {open ? "open" : "closed"}</p>

			<div className="relative overflow-hidden rounded-xl border p-6" data-testid="beam-card">
				<p>Light effect</p>
				<BorderBeam />
			</div>

			<div className="relative h-48 overflow-hidden rounded-xl border" data-testid="fluid">
				<FluidCursor contained />
			</div>
		</main>
	);
}
