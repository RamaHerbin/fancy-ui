// Mirrors src/lib/components/docs/examples/web-search/BasicUsage.svelte (staged search loop).
import { useEffect, useRef, useState } from "react";
import { WebSearch } from "fancy-ui-react";

const QUERY = "postgres connection pool exhausted under load";

const HITS = [
	{
		id: "h1",
		title: "Why your pool runs dry before your database does",
		url: "https://www.example.dev/posts/pool-exhaustion",
		snippet:
			"Connection limits are usually reached by leaked handles rather than by traffic. The give-away is a pool that never recovers after the spike passes.",
	},
	{
		id: "h2",
		title: "Sizing a connection pool",
		url: "https://notes.example.org/pool-sizing",
		snippet:
			"A pool larger than the server's max_connections turns a queue you can observe into an error you cannot.",
	},
	{
		id: "h3",
		title: "Tracking down a leaked transaction",
		url: "https://example.net/guides/leaked-transactions",
		snippet:
			"pg_stat_activity tells you which query is holding a connection open and for how long it has been idle in transaction.",
	},
	{
		id: "h4",
		title: "Backpressure beats a bigger pool",
		url: "https://blog.example.com/backpressure",
		snippet: "Queueing at the edge fails a request in milliseconds instead of in thirty seconds.",
	},
];

const HIT_MS = 700;
const REPLAY_MS = 2600;

export default function Scenario() {
	const [count, setCount] = useState(0);
	const countRef = useRef(0);

	useEffect(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			countRef.current = HITS.length;
			setCount(HITS.length);
			return;
		}
		let timer: ReturnType<typeof setTimeout>;
		const tick = () => {
			const done = countRef.current === HITS.length;
			timer = setTimeout(
				() => {
					countRef.current = done ? 0 : countRef.current + 1;
					setCount(countRef.current);
					tick();
				},
				done ? REPLAY_MS : HIT_MS
			);
		};
		tick();
		return () => clearTimeout(timer);
	}, []);

	return (
		<div className="w-full max-w-xl" style={{ minHeight: "24rem" }}>
			<WebSearch
				sound
				query={QUERY}
				results={HITS.slice(0, count)}
				searching={count < HITS.length}
			/>
		</div>
	);
}
