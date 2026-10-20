// Mirrors src/lib/components/docs/examples/toggle-group/BasicUsage.svelte.
import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "fancy-ui-react";

export default function Scenario() {
	const [alignment, setAlignment] = useState<string | string[]>("left");

	return (
		<ToggleGroup sound value={alignment} onValueChange={setAlignment} label="Text alignment">
			<ToggleGroupItem value="left" label="Align left">
				<svg
					className="size-4"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					aria-hidden="true"
				>
					<line x1="3" y1="6" x2="21" y2="6" />
					<line x1="3" y1="12" x2="15" y2="12" />
					<line x1="3" y1="18" x2="18" y2="18" />
				</svg>
			</ToggleGroupItem>
			<ToggleGroupItem value="center" label="Align center">
				<svg
					className="size-4"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					aria-hidden="true"
				>
					<line x1="3" y1="6" x2="21" y2="6" />
					<line x1="6" y1="12" x2="18" y2="12" />
					<line x1="4" y1="18" x2="20" y2="18" />
				</svg>
			</ToggleGroupItem>
			<ToggleGroupItem value="right" label="Align right">
				<svg
					className="size-4"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					aria-hidden="true"
				>
					<line x1="3" y1="6" x2="21" y2="6" />
					<line x1="9" y1="12" x2="21" y2="12" />
					<line x1="6" y1="18" x2="21" y2="18" />
				</svg>
			</ToggleGroupItem>
		</ToggleGroup>
	);
}
