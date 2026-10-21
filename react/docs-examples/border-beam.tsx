import { BorderBeam } from "fancy-ui-react";

export function BorderBeamExample() {
	return (
		<div className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border p-6 [--border-beam-radius:16px]">
			<p className="text-sm font-medium">Deploy in progress</p>
			<p className="text-xs opacity-60">edge-eu-west · build 1482</p>
			<BorderBeam />
		</div>
	);
}
