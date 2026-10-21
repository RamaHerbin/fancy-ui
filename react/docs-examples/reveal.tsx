import { useState } from "react";
import { Button, Reveal } from "fancy-ui-react";

const features = [
	{ title: "Fast setup", body: "Drop it around any content, no config required." },
	{
		title: "Accessible by default",
		body: "Keyboard focus and reduced motion are both handled for you.",
	},
	{ title: "Themeable", body: "Every timing and distance is a CSS variable." },
];

export function RevealExample() {
	// Changing the key remounts Reveal, which plays the entrance again.
	const [replayKey, setReplayKey] = useState(0);

	return (
		<div className="flex w-full flex-col gap-4 p-6">
			<div className="flex justify-end">
				<Button variant="outline" size="sm" onClick={() => setReplayKey((key) => key + 1)}>
					Replay
				</Button>
			</div>

			<Reveal
				key={replayKey}
				trigger="mount"
				stagger={80}
				className="grid grid-cols-1 gap-4 sm:grid-cols-3"
			>
				{features.map((feature) => (
					<div key={feature.title} className="bg-card border-border rounded-lg border p-4">
						<h3 className="text-foreground text-sm font-semibold">{feature.title}</h3>
						<p className="text-muted-foreground mt-1 text-sm">{feature.body}</p>
					</div>
				))}
			</Reveal>
		</div>
	);
}
