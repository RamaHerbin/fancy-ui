// Mirrors the direct render of $lib/fancy-ui/textarea (Textarea, label + placeholder) in DemoRenderer.svelte.
import { Textarea } from "fancy-ui-react";

export default function Scenario() {
	return (
		<div className="w-full max-w-sm px-6">
			<Textarea label="Message" placeholder="Tell us what you think…" />
		</div>
	);
}
