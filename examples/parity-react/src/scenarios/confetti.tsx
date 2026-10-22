// Mirrors src/lib/components/docs/DemoRenderer.svelte, slug "confetti":
// <ConfettiButton> (no props) wrapping the "Click for Confetti" button.
import { ConfettiButton } from "fancy-ui-react";

export default function Scenario() {
	return (
		<ConfettiButton>
			<button className="bg-foreground text-background rounded-md px-4 py-2 text-sm font-medium">
				Click for Confetti
			</button>
		</ConfettiButton>
	);
}
