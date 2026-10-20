// Mirrors src/lib/components/docs/examples/reveal/BasicUsage.svelte.
import { Fragment, useState } from "react";
import { Button, Reveal } from "fancy-ui-react";

export default function Scenario() {
	// Remounting Reveal (via key) re-plays trigger="mount" from scratch.
	const [replayKey, setReplayKey] = useState(0);

	return (
		<div className="flex w-full flex-col gap-4 p-6">
			<div className="flex justify-end">
				<Button variant="outline" size="sm" onClick={() => setReplayKey((k) => k + 1)}>
					Replay
				</Button>
			</div>

			<Fragment key={replayKey}>
				{/* stagger widened from the 50ms ladder step so the cascade reads at preview size */}
				<Reveal trigger="mount" stagger={80} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
					<div className="bg-card border-border rounded-lg border p-4">
						<h3 className="text-foreground text-sm font-semibold">Fast setup</h3>
						<p className="text-muted-foreground mt-1 text-sm">
							Drop it around any content, no config required.
						</p>
					</div>
					<div className="bg-card border-border rounded-lg border p-4">
						<h3 className="text-foreground text-sm font-semibold">Accessible by default</h3>
						<p className="text-muted-foreground mt-1 text-sm">
							Keyboard focus and reduced motion are both handled for you.
						</p>
					</div>
					<div className="bg-card border-border rounded-lg border p-4">
						<h3 className="text-foreground text-sm font-semibold">Themeable</h3>
						<p className="text-muted-foreground mt-1 text-sm">
							Every timing and distance is a CSS variable.
						</p>
					</div>
				</Reveal>
			</Fragment>
		</div>
	);
}
