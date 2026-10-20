// Mirrors src/lib/components/docs/DemoRenderer.svelte, slug "flickering-grid":
// <FlickeringGrid color="#6366f1" maxOpacity={0.2} squareSize={4} gridGap={6} /> (defaultProps).
import { FlickeringGrid } from "fancy-ui-react";

export default function Scenario() {
	return <FlickeringGrid color="#6366f1" maxOpacity={0.2} squareSize={4} gridGap={6} />;
}
