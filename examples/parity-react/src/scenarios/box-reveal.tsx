// Mirrors the direct render of $lib/fancy-ui/box-reveal (BoxReveal) in DemoRenderer.svelte.
import { BoxReveal } from "fancy-ui-react";

export default function Scenario() {
	return (
		<BoxReveal color="var(--primary)" duration={0.5}>
			<h2 className="text-foreground text-2xl font-bold">Box Reveal</h2>
		</BoxReveal>
	);
}
