// Mirrors src/lib/components/docs/examples/liquid-glass/Navbar.svelte
// (PREVIEW_EXAMPLE["liquid-glass"] = "Navbar").
import { LiquidGlass } from "fancy-ui-react";

export default function Scenario() {
	return (
		<div className="relative h-[440px] w-full overflow-hidden rounded-lg border bg-[#fafafa]">
			<div className="absolute inset-0 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
				{/* Hero */}
				<div className="flex min-h-[420px] flex-col items-center justify-center px-8 pt-24 text-center">
					<span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-500">
						Now available for macOS
					</span>
					<h1 className="mt-5 max-w-md text-4xl leading-tight font-semibold tracking-tight text-gray-900">
						Your UI, at the speed of thought.
					</h1>
					<p className="mt-4 max-w-sm text-sm text-gray-500">
						FancyOS turns your voice into polished interfaces. Speak naturally, ship beautifully.
					</p>
					<div className="mt-6 flex items-center gap-3">
						<span className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white">
							Download
						</span>
						<span className="px-3 py-2.5 text-sm font-medium text-gray-600">Watch demo</span>
					</div>
				</div>

				{/* Colorful sections to scroll behind the nav */}
				<div className="space-y-6 px-8 pb-12">
					{Array.from({ length: 6 }, (_, i) => (
						<div
							key={i}
							className="flex h-32 items-end rounded-3xl p-5"
							style={{
								background: `linear-gradient(120deg, hsl(${210 + i * 40}, 75%, 62%), hsl(${250 + i * 40}, 70%, 55%))`,
							}}
						>
							<p className="text-sm font-semibold text-white/90">Feature {i + 1}</p>
						</div>
					))}
				</div>
			</div>

			{/* Fixed pill nav */}
			<div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center px-6">
				<div className="pointer-events-auto w-full max-w-lg">
					<LiquidGlass radius={9999} containerClass="w-full">
						<nav className="flex w-full items-center justify-between px-6 py-3">
							<span className="flex items-center gap-1.5 text-sm font-bold tracking-tight text-gray-900">
								<span className="inline-block size-4 rounded-full bg-gray-900"></span>
								FancyOS
							</span>
							<div className="flex items-center gap-5 text-[13px] font-medium text-gray-800">
								<span className="hidden sm:inline">Manifesto</span>
								<span className="hidden sm:inline">Pricing</span>
								<span className="hidden sm:inline">Blog</span>
								<span className="rounded-full bg-gray-900 px-3.5 py-1.5 text-xs font-semibold text-white">
									Download
								</span>
							</div>
						</nav>
					</LiquidGlass>
				</div>
			</div>
		</div>
	);
}
