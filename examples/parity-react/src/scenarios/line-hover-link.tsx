// Mirrors src/lib/components/docs/DemoRenderer.svelte, slug "line-hover-link":
// three LineHoverLink variants in a column.
import { LineHoverLink } from "fancy-ui-react";

export default function Scenario() {
	return (
		<div className="flex flex-col gap-4">
			<LineHoverLink href="#" variant="slide">
				Slide
			</LineHoverLink>
			<LineHoverLink href="#" variant="grow">
				Grow
			</LineHoverLink>
			<LineHoverLink href="#" variant="sweep">
				Sweep
			</LineHoverLink>
		</div>
	);
}
