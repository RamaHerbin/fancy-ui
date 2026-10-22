// Mirrors the direct render of $lib/fancy-ui/toggle (Toggle, label "Bold") in DemoRenderer.svelte.
import { Toggle } from "fancy-ui-react";

export default function Scenario() {
	return (
		<Toggle label="Bold">
			<span className="font-bold">B</span>
		</Toggle>
	);
}
