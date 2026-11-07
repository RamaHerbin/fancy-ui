// Mirrors DemoRenderer.svelte, slug "date-picker": <DatePicker label="Date" placeholder="Pick a date" />.
import { DatePicker } from "fancy-ui-react";

export default function Scenario() {
	return (
		<div className="w-full max-w-sm px-6">
			<DatePicker label="Date" placeholder="Pick a date" />
		</div>
	);
}
