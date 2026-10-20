// Mirrors src/lib/components/docs/examples/smooth-cursor/BasicUsage.svelte.
import { useState } from "react";
import { SmoothCursor } from "fancy-ui-react";

export default function Scenario() {
	// Scope the cursor to this canvas: it mounts while the pointer is inside.
	const [inside, setInside] = useState(false);

	return (
		<>
			<div className="w-full rounded-2xl border border-black/[0.08] bg-[#f4f4f5] p-1.5 dark:border-white/[0.08] dark:bg-[#0b0b0c]">
				<div
					role="presentation"
					className="relative flex h-72 cursor-none items-center justify-center overflow-hidden rounded-xl border border-black/[0.08] bg-[#fafafa] bg-[radial-gradient(rgba(0,0,0,0.09)_1px,transparent_1px)] [background-size:18px_18px] dark:border-white/[0.08] dark:bg-[#141416] dark:bg-[radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)]"
					onPointerEnter={() => setInside(true)}
					onPointerLeave={() => setInside(false)}
				>
					<div className="flex flex-col items-center gap-2 select-none">
						<span className="rounded-full border border-black/[0.08] bg-white px-3 py-1 text-xs text-neutral-500 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-neutral-400">
							Move your pointer here
						</span>
						<span className="text-[11px] text-neutral-400 dark:text-neutral-500">
							Rest for a moment and the name pill dims
						</span>
					</div>
				</div>
			</div>

			{inside && <SmoothCursor label="You" />}
		</>
	);
}
