// Mirrors src/lib/components/docs/examples/border-beam/BasicUsage.svelte.
import { BorderBeam } from "fancy-ui-react";

export default function Scenario() {
	return (
		<>
			{/* outer frame */}
			<div className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-black/[0.08] bg-[#f4f4f5] p-1.5 [--border-beam-radius:16px] dark:border-white/[0.08] dark:bg-[#0b0b0c]">
				{/* inner frame */}
				<div className="relative rounded-[11px] border border-black/[0.06] bg-[#fafafa] p-6 dark:border-white/[0.06] dark:bg-[#141416]">
					<div className="flex items-center gap-3">
						<span
							className="flex size-9 items-center justify-center rounded-lg border border-black/[0.08] bg-white text-sm dark:border-white/[0.08] dark:bg-white/[0.03]"
							aria-hidden="true"
						>
							<svg
								viewBox="0 0 16 16"
								className="size-4 text-neutral-500 dark:text-neutral-400"
								fill="none"
							>
								<path
									d="M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3"
									stroke="currentColor"
									strokeWidth="1.3"
									strokeLinecap="round"
								/>
								<circle cx="8" cy="8" r="1.6" fill="currentColor" />
							</svg>
						</span>
						<div>
							<p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
								Deploy in progress
							</p>
							<p className="text-xs text-neutral-500">edge-eu-west · build 1482</p>
						</div>
					</div>
					<div className="mt-5 h-1 overflow-hidden rounded-full bg-black/[0.05] dark:bg-white/[0.06]">
						<div className="h-full w-3/5 rounded-full bg-neutral-400/60 dark:bg-neutral-500/60"></div>
					</div>
					<p className="mt-3 font-mono text-[11px] text-neutral-500">
						Optimising assets — 3 of 5 steps
					</p>
				</div>
				<BorderBeam />
			</div>
		</>
	);
}
