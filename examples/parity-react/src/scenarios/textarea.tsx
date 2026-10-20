// Mirrors the direct render of $lib/fancy-ui/textarea (Textarea, label + placeholder) in DemoRenderer.svelte.
import { Textarea } from "fancy-ui-react";

export default function Scenario() {
	return <Textarea label="Message" placeholder="Tell us what you think…" />;
}
