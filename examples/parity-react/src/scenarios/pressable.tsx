// Mirrors src/lib/components/docs/examples/pressable/BasicUsage.svelte.
import { Pressable } from "fancy-ui-react";

const REPLIES = ["Sounds good", "Not today", "Let's talk"];

export default function Scenario() {
	return (
		<div className="flex w-full items-center justify-center p-6">
			<div className="border-border bg-card w-full max-w-[280px] rounded-[1.75rem] border p-4 shadow-sm">
				<p className="text-muted-foreground mb-3 text-xs">Quick replies</p>
				<div className="flex flex-wrap gap-2">
					{REPLIES.map((reply) => (
						<Pressable key={reply}>
							<button
								type="button"
								className="border-border bg-muted text-foreground rounded-full border px-3.5 py-1.5 text-sm"
							>
								{reply}
							</button>
						</Pressable>
					))}
				</div>
				<p className="text-muted-foreground mt-4 text-xs">
					Tap a chip (or focus one and press Space/Enter) — it gives under the press, then settles
					back the instant you let go. With reduced motion it dims instead of shrinking.
				</p>
			</div>
		</div>
	);
}
