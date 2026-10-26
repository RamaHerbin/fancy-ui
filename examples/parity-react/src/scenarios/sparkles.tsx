// Mirrors src/lib/components/docs/DemoRenderer.svelte, slug "sparkles": the `defaultProps`
// (dark backdrop, currentColor particles, density 160, text-white) inside the `previewBox` stage.
import { Sparkles } from "fancy-ui-react";

export default function Scenario() {
	return (
		<div data-demo-stage className="relative flex h-[300px] w-full items-center justify-center">
			<Sparkles
				background="#0b1020"
				particleColor="currentColor"
				particleDensity={160}
				className="text-white"
			/>
		</div>
	);
}
