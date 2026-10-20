// Mirrors the direct render of $lib/fancy-ui/terminal-text (TerminalText, lines) in DemoRenderer.svelte.
import { TerminalText } from "fancy-ui-react";

export default function Scenario() {
	return <TerminalText lines={["$ npm install fancy-ui", "Installing...", "Done!"]} />;
}
