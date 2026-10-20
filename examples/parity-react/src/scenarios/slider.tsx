// Mirrors src/lib/components/docs/DemoRenderer.svelte, slug "slider":
// <Slider label="Volume" value={60} showValue showBounds /> (defaultProps).
import { Slider } from "fancy-ui-react";

export default function Scenario() {
	return <Slider label="Volume" value={60} showValue showBounds />;
}
