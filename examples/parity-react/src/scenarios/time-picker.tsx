// Mirrors the direct render of $lib/fancy-ui/time-picker (TimePicker, label + placeholder) in DemoRenderer.svelte.
import { TimePicker } from "fancy-ui-react";

export default function Scenario() {
	return (
		<div className="w-full max-w-sm px-6 pb-56">
			<TimePicker label="Time" placeholder="Pick a time" />
		</div>
	);
}
