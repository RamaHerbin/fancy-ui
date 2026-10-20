// Mirrors src/lib/components/docs/DemoRenderer.svelte, slug "skeleton":
// <Skeleton variant="text" lines={3} class="w-72 text-base" /> (defaultProps).
import { Skeleton } from "fancy-ui-react";

export default function Scenario() {
	return <Skeleton variant="text" lines={3} className="w-72 text-base" />;
}
