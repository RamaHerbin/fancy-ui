// Mirrors src/lib/components/docs/DemoRenderer.svelte, slug "flip-words":
// <FlipWords words={defaultProps["flip-words"].words} />.
import { FlipWords } from "fancy-ui-react";

export default function Scenario() {
	return <FlipWords words={["beautiful", "animated", "interactive", "composable"]} />;
}
