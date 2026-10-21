import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "fancy-ui-react";

const iconProps = {
	className: "size-4",
	viewBox: "0 0 24 24",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: 2,
	strokeLinecap: "round",
	"aria-hidden": true,
} as const;

export function ToggleGroupExample() {
	const [alignment, setAlignment] = useState("left");

	return (
		<ToggleGroup
			sound
			label="Text alignment"
			value={alignment}
			onValueChange={(next) => setAlignment(String(next))}
		>
			<ToggleGroupItem value="left" label="Align left">
				<svg {...iconProps}>
					<line x1="3" y1="6" x2="21" y2="6" />
					<line x1="3" y1="12" x2="15" y2="12" />
					<line x1="3" y1="18" x2="18" y2="18" />
				</svg>
			</ToggleGroupItem>
			<ToggleGroupItem value="center" label="Align center">
				<svg {...iconProps}>
					<line x1="3" y1="6" x2="21" y2="6" />
					<line x1="6" y1="12" x2="18" y2="12" />
					<line x1="4" y1="18" x2="20" y2="18" />
				</svg>
			</ToggleGroupItem>
			<ToggleGroupItem value="right" label="Align right">
				<svg {...iconProps}>
					<line x1="3" y1="6" x2="21" y2="6" />
					<line x1="9" y1="12" x2="21" y2="12" />
					<line x1="6" y1="18" x2="21" y2="18" />
				</svg>
			</ToggleGroupItem>
		</ToggleGroup>
	);
}
