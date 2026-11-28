// Mirrors src/lib/components/docs/examples/optical-disc/BasicUsage.svelte.
import { OpticalDisc } from "fancy-ui-react";

export default function Scenario() {
	return (
		<div className="flex w-full items-center justify-center rounded-xl bg-gradient-to-b from-sky-500 to-sky-200 p-8">
			<OpticalDisc alt="A spinning disc" className="max-w-xs" />
		</div>
	);
}
