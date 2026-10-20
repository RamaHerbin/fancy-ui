// Mirrors src/lib/components/docs/examples/line-reveal/BasicUsage.svelte.
import { LineReveal } from "fancy-ui-react";

export default function Scenario() {
	return (
		<div
			className="resize-x overflow-auto rounded border border-dashed p-4"
			style={{ maxWidth: "100%" }}
		>
			<LineReveal
				text="Text measurement and layout, without touching the DOM. Every line you see here was computed by pretext and revealed one by one."
				font="700 32px Helvetica, Arial, sans-serif"
			/>
			<p className="text-muted-foreground mt-3 text-xs">
				Drag the resize handle — lines re-wrap instantly without replaying the animation.
			</p>
		</div>
	);
}
