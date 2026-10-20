// Mirrors src/lib/components/docs/examples/prompt-suggestions/BasicUsage.svelte.
import { useEffect, useRef, useState } from "react";
import { PromptSuggestions } from "fancy-ui-react";

const SUGGESTIONS = [
	"Why was the lockfile stale?",
	"Show me the failing job",
	"Turn the cache back on",
	"Summarize this for the team",
];

/** How long the reply sits alone before the follow-ups offer themselves. */
const APPEAR_MS = 700;
/** The beat the pills spend hidden before replaying, after one is picked. */
const REPLAY_MS = 260;

export default function Scenario() {
	const [visible, setVisible] = useState(false);
	const [turns, setTurns] = useState<string[]>([]);
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const reduced = useRef(false);

	useEffect(() => {
		reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (reduced.current) {
			setVisible(true);
			return;
		}
		timer.current = setTimeout(() => setVisible(true), APPEAR_MS);
		return () => clearTimeout(timer.current);
	}, []);

	function select(suggestion: string) {
		setTurns((t) => [...t, suggestion]);
		if (reduced.current) return;
		setVisible(false);
		clearTimeout(timer.current);
		timer.current = setTimeout(() => setVisible(true), REPLAY_MS);
	}

	return (
		<div className="flex w-full max-w-xl flex-col gap-3">
			<div className="bg-muted text-foreground mr-auto max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-3">
				<p className="text-sm leading-relaxed">
					The build is green again. The failure came from a stale lockfile in the CI cache rather
					than from anything in your branch — I re-ran the job with the cache disabled and every
					suite passed on the first attempt.
				</p>
			</div>

			{turns.map((turn, i) => (
				<div
					key={i}
					className="bg-primary text-primary-foreground ml-auto max-w-[85%] rounded-2xl rounded-br-sm px-4 py-2.5"
				>
					<p className="text-sm">{turn}</p>
				</div>
			))}

			<PromptSuggestions
				sound
				suggestions={SUGGESTIONS}
				visible={visible}
				onSelect={select}
				label="Follow-up prompts"
				className="mt-1"
			/>
		</div>
	);
}
