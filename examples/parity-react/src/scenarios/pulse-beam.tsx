// Mirrors src/lib/components/docs/examples/pulse-beam/BasicUsage.svelte.
// Icons are the same stroke paths the Svelte demo's icon set draws.
import { PulseBeam } from "fancy-ui-react";

function Icon({ className, children }: { className: string; children: React.ReactNode }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			{children}
		</svg>
	);
}

export default function Scenario() {
	return (
		// The child owns the surface: opaque background + the same radius as the beam.
		<PulseBeam radius={20} className="mx-auto w-full max-w-md">
			<div className="bg-card rounded-[20px] p-4">
				<p className="text-muted-foreground text-sm">Build anything…</p>
				<div className="mt-8 flex items-center gap-2">
					<span className="bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs">
						<Icon className="size-3.5">
							<path d="M12 8V4H8" />
							<rect width="16" height="12" x="4" y="8" rx="2" />
							<path d="M2 14h2" />
							<path d="M20 14h2" />
							<path d="M15 13v2" />
							<path d="M9 13v2" />
						</Icon>
						Agent
					</span>
					<span className="bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs">
						<Icon className="size-3.5">
							<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
							<path d="M20 2v4" />
							<path d="M22 4h-4" />
							<circle cx="4" cy="20" r="2" />
						</Icon>
						Auto
					</span>
					<span className="bg-foreground text-background ml-auto inline-flex size-8 items-center justify-center rounded-full">
						<Icon className="size-4">
							<path d="m5 12 7-7 7 7" />
							<path d="M12 19V5" />
						</Icon>
					</span>
				</div>
			</div>
		</PulseBeam>
	);
}
