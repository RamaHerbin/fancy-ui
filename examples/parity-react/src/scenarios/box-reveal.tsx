// Mirrors the direct render of $lib/fancy-ui/box-reveal (BoxReveal) in DemoRenderer.svelte.
import { useState } from "react";
import { BoxReveal, Button } from "fancy-ui-react";

export default function Scenario() {
	// BoxReveal plays once on mount; remounting it (via key) replays it.
	const [replayKey, setReplayKey] = useState(0);

	return (
		<div className="flex flex-col items-center gap-6">
			<BoxReveal key={replayKey} color="var(--primary)" duration={0.5}>
				<h2 className="text-foreground text-2xl font-bold">Box Reveal</h2>
			</BoxReveal>
			<Button variant="outline" size="sm" onClick={() => setReplayKey((k) => k + 1)}>
				Replay
			</Button>
		</div>
	);
}
