// Mirrors src/lib/components/docs/examples/reasoning-panel/BasicUsage.svelte.
import { useEffect, useState } from "react";
import { ReasoningPanel } from "fancy-ui-react";

const TRACE = [
	"The user wants the total per region, but the orders table only stores a city.",
	" So I need the city → region mapping before anything else can be aggregated.",
	" There is a `regions` lookup table with a `city_id` foreign key — that joins cleanly.",
	" One catch: cities with no region row would vanish under an inner join.",
	" A left join keeps them and buckets them as “Unassigned”, which is the safer default.",
	" Grouping on the region name rather than its id keeps the output readable.",
];

/** How long a finished trace rests before the loop starts over. */
const REST_MS = 1200;
const CHUNK_MS = 220;

export default function Scenario() {
	const [text, setText] = useState("");
	const [streaming, setStreaming] = useState(false);
	const [since, setSince] = useState<number | undefined>(undefined);
	const [open, setOpen] = useState<boolean | undefined>(undefined);

	useEffect(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			setText(TRACE.join(""));
			setOpen(true);
			return;
		}

		let timer: ReturnType<typeof setTimeout>;
		let i = 0;

		function tick() {
			if (i < TRACE.length) {
				const chunk = TRACE[i];
				setText((t) => t + chunk);
				i += 1;
				timer = setTimeout(tick, CHUNK_MS);
				return;
			}
			setStreaming(false);
			timer = setTimeout(restart, REST_MS);
		}

		function restart() {
			setText("");
			i = 0;
			setStreaming(true);
			setSince(Date.now());
			timer = setTimeout(tick, CHUNK_MS);
		}

		restart();
		return () => clearTimeout(timer);
	}, []);

	return (
		<div className="w-full max-w-xl">
			<ReasoningPanel
				sound
				text={text}
				streaming={streaming}
				since={since}
				open={open}
				onToggle={setOpen}
				label="Reasoning"
			/>
			<p className="text-muted-foreground mt-3 text-xs">
				Streams while it thinks, then folds itself into a summary. Click the header at any point and
				it stays exactly where you left it.
			</p>
		</div>
	);
}
