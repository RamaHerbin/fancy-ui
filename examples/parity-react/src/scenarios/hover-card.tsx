// Mirrors src/lib/components/docs/examples/hover-card/BasicUsage.svelte.
import { HoverCard } from "fancy-ui-react";

export default function Scenario() {
	return (
		<HoverCard
			trigger={(describedBy) => (
				<button
					type="button"
					aria-describedby={describedBy}
					className="text-[13px] font-medium text-violet-300 hover:underline"
				>
					@alexrivera
				</button>
			)}
		>
			<div className="flex items-center gap-2.5">
				<span className="h-9 w-9 flex-none rounded-full bg-gradient-to-br from-violet-500 to-sky-400"></span>
				<div className="flex flex-col">
					<span className="text-[13px] font-semibold">Alex Rivera</span>
					<span className="text-muted-foreground text-[11px]">@alexrivera</span>
				</div>
			</div>
			<p className="text-muted-foreground text-[12px] leading-relaxed">
				Frontend engineer. Building accessible interfaces, one component at a time.
			</p>
		</HoverCard>
	);
}
