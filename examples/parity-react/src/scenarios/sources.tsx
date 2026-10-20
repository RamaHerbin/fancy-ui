// Mirrors src/lib/components/docs/examples/sources/BasicUsage.svelte.
import { useEffect, useRef, useState } from "react";
import { Sources, type SourceData } from "fancy-ui-react";

const answer =
	"Readers rarely click a citation — they look at it. So the pill has to carry enough signal on its own to say where an answer came from, and open into something scannable for the one time in ten that looking is not enough.";

const sources: SourceData[] = [
	{
		id: "s1",
		title: "Designing citation surfaces for generated answers",
		url: "https://docs.example.dev/patterns/citations",
		domain: "docs.example.dev",
		snippet: "A citation is a promise that the answer can be checked, not a footnote.",
	},
	{
		id: "s2",
		title: "Retrieval quality and the illusion of grounding",
		url: "https://research.example.org/papers/grounding",
		domain: "research.example.org",
		snippet: "Four plausible sources under a wrong answer make it read as a right one.",
	},
	{
		id: "s3",
		title: "Why readers glance at sources instead of opening them",
		url: "https://notes.example.net/reading-citations",
		domain: "notes.example.net",
		snippet: "The host name does most of the work; the title does the rest.",
	},
	{
		id: "s4",
		title: "A field guide to attribution in assistant answers",
		url: "https://handbook.example.io/attribution",
		domain: "handbook.example.io",
		snippet: "Say where it came from before anyone has to ask.",
	},
];

export default function Scenario() {
	const [open, setOpen] = useState(false);
	const readerTookOver = useRef(false);

	useEffect(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

		let timer: ReturnType<typeof setTimeout>;

		function cycle(next: boolean, after: number) {
			timer = setTimeout(() => {
				if (readerTookOver.current) return;
				setOpen(next);
				cycle(!next, next ? 5200 : 1600);
			}, after);
		}

		cycle(true, 1200);
		return () => clearTimeout(timer);
	}, []);

	return (
		<div className="bg-card flex w-full max-w-xl flex-col gap-3 rounded-lg border p-5">
			<p className="text-sm leading-relaxed">{answer}</p>

			<Sources
				sound
				sources={sources}
				open={open}
				onToggle={(next) => {
					readerTookOver.current = true;
					setOpen(next);
				}}
			/>
		</div>
	);
}
