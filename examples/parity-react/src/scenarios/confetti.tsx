// Mirrors src/lib/components/docs/DemoRenderer.svelte, slug "confetti":
// <ConfettiButton> is itself the button, so it carries the classes and the label.
import { ConfettiButton } from "fancy-ui-react";

export default function Scenario() {
	return (
		<ConfettiButton className="bg-foreground text-background rounded-md px-4 py-2 text-sm font-medium">
			Click for Confetti
		</ConfettiButton>
	);
}
