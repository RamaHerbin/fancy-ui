// Mirrors the direct render of $lib/fancy-ui/time-picker (TimePicker, label + placeholder) in DemoRenderer.svelte.
import { TimePicker } from "fancy-ui-react";

export default function Scenario() {
	return <TimePicker label="Time" placeholder="Pick a time" />;
}
