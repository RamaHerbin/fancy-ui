// Mirrors src/lib/components/docs/examples/datamosh-transition/BasicUsage.svelte.
import { useRef, useState } from "react";
import { DatamoshTransition, type DatamoshTransitionHandle } from "fancy-ui-react";

const pages = [
	{ title: "Page one", body: "Press the button to go to the next page." },
	{ title: "Page two", body: "The page changed while the screen was covered." },
];

export default function Scenario() {
	const transition = useRef<DatamoshTransitionHandle>(null);
	const [current, setCurrent] = useState(0);
	const [busy, setBusy] = useState(false);

	async function navigate() {
		if (busy || !transition.current) return;
		setBusy(true);
		await transition.current.cover();
		setCurrent((c) => (c + 1) % pages.length);
		await transition.current.reveal();
		setBusy(false);
	}

	return (
		<div className="relative flex h-80 w-full flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-[#14101f] text-center text-white">
			<h3 className="text-3xl font-semibold tracking-tight">{pages[current].title}</h3>
			<p className="text-sm text-white/60">{pages[current].body}</p>
			<button
				className="rounded-full bg-white px-4 py-2 text-sm font-medium text-[#14101f] disabled:opacity-60"
				onClick={navigate}
				disabled={busy}
			>
				Next page
			</button>
			<DatamoshTransition ref={transition} contained />
		</div>
	);
}
