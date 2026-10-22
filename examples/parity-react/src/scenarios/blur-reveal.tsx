// Mirrors the direct render of $lib/fancy-ui/blur-reveal (BlurReveal) in DemoRenderer.svelte.
import { BlurReveal } from "fancy-ui-react";

export default function Scenario() {
	return (
		<BlurReveal>
			<h2 className="text-foreground text-2xl font-bold">Blur Reveal Effect</h2>
			<p className="text-muted-foreground">Content fades in from blur as you scroll.</p>
		</BlurReveal>
	);
}
