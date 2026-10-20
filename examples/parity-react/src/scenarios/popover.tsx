// Mirrors src/lib/components/docs/examples/popover/BasicUsage.svelte.
import { useState } from "react";
import { Popover } from "fancy-ui-react";

export default function Scenario() {
	const [width, setWidth] = useState("100%");
	const [height, setHeight] = useState("25px");

	return (
		<Popover sound className="w-[220px]" trigger={<>⚙ Options</>}>
			<span className="text-[13px] font-semibold">Dimensions</span>
			<div className="flex gap-2">
				<input
					value={width}
					onChange={(e) => setWidth(e.target.value)}
					aria-label="Width"
					className="border-input bg-background text-foreground min-w-0 flex-1 rounded-[6px] border px-2 py-[5px] text-[12px]"
				/>
				<input
					value={height}
					onChange={(e) => setHeight(e.target.value)}
					aria-label="Height"
					className="border-input bg-background text-foreground min-w-0 flex-1 rounded-[6px] border px-2 py-[5px] text-[12px]"
				/>
			</div>
		</Popover>
	);
}
