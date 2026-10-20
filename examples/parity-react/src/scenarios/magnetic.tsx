// Mirrors src/lib/components/docs/examples/magnetic/BasicUsage.svelte.
import { Magnetic, Button } from "fancy-ui-react";

export default function Scenario() {
	return (
		<div className="flex min-h-[280px] flex-col items-center justify-center gap-4 p-10">
			<Magnetic>
				<Button variant="outline" size="lg">
					Get in touch
				</Button>
			</Magnetic>
			<p className="text-muted-foreground max-w-sm text-center text-xs">
				Move the cursor near the button — it leans toward you before you even touch it, then settles
				back once you leave. On a touchscreen nothing moves, and tabbing to it never starts a pull:
				attraction needs a pointer position, and a keyboard has none.
			</p>
		</div>
	);
}
