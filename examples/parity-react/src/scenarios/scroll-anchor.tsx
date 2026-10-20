// Mirrors src/lib/components/docs/examples/scroll-anchor/BasicUsage.svelte.
import { useEffect, useState } from "react";
import { ScrollAnchor } from "fancy-ui-react";

/** How long each line waits before the next one lands. */
const TICK_MS = 800;
/** How long the finished transcript sits there before the run starts over. */
const HOLD_MS = 3200;

const LINES = [
	"Reading the billing schema…",
	"`invoices` has a `status` column, four values.",
	"Only `open` and `past_due` count as owed.",
	"Joining `customers` to get a name per row.",
	"Two customers have no row in `customers` — left join, then.",
	"Grouping by customer, summing `amount_due`.",
	"Ordering by the total, largest first.",
	"Capping at twenty so the answer stays readable.",
	"Running it against the read replica…",
	"18 rows. Two of them are the same customer under different ids.",
	"Folding those together on `email`.",
	"17 rows. That's the answer.",
];

export default function Scenario() {
	const [shown, setShown] = useState(1);
	const [streaming, setStreaming] = useState(true);

	useEffect(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			setShown(LINES.length);
			setStreaming(false);
			return;
		}

		let timer: ReturnType<typeof setTimeout>;
		let count = 1;

		function step() {
			if (count < LINES.length) {
				count += 1;
				setShown(count);
				timer = setTimeout(step, TICK_MS);
				return;
			}
			timer = setTimeout(() => {
				count = 1;
				setShown(1);
				timer = setTimeout(step, TICK_MS);
			}, HOLD_MS);
		}

		timer = setTimeout(step, TICK_MS);
		return () => clearTimeout(timer);
	}, []);

	return (
		<div className="flex w-full max-w-lg flex-col gap-3 p-6">
			<ScrollAnchor
				sound
				active={streaming}
				maxHeight="13rem"
				className="border-border bg-card/50 rounded-lg border"
			>
				<div className="flex flex-col gap-2 p-4 font-mono text-xs leading-relaxed">
					{LINES.slice(0, shown).map((line, i) => (
						<p key={`${line}#${i}`} className="text-muted-foreground">
							{line}
						</p>
					))}
				</div>
			</ScrollAnchor>

			<p className="text-muted-foreground text-xs">
				The region stays pinned to the last line while the transcript grows. Scroll up mid-stream
				and it lets go — a “Jump to latest” pill appears, and pressing it hands the region back to
				the stream.
			</p>
		</div>
	);
}
