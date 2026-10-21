import { GlowBorder } from "fancy-ui-react";

export function GlowBorderExample() {
	return (
		<div className="bg-background relative flex h-40 w-64 items-center justify-center rounded-xl p-6">
			<p className="text-muted-foreground text-center">Content goes here</p>
			<GlowBorder />
		</div>
	);
}
