// Mirrors the direct render of $lib/fancy-ui/bg-stars (StarsBackground, no props) in DemoRenderer.svelte,
// inside the `previewBox` stage.
import { StarsBackground } from "fancy-ui-react";

export default function Scenario() {
	return (
		<div data-demo-stage className="relative flex h-[300px] w-full items-center justify-center">
			<StarsBackground />
		</div>
	);
}
