// Mirrors src/lib/components/docs/examples/tick-nav/BasicUsage.svelte.
import { useState, type CSSProperties } from "react";
import { TickNav, type TickNavItem } from "fancy-ui-react";

const items: TickNavItem[] = [
	{ id: "signal", label: "01 Signal" },
	{ id: "noise", label: "02 Noise" },
	{ id: "pulse", label: "03 Pulse" },
	{ id: "drift", label: "04 Drift", badge: "New" },
	{ id: "echo", label: "05 Echo" },
	{ id: "static", label: "06 Static" },
	{ id: "carrier", label: "07 Carrier" },
];

export default function Scenario() {
	const [value, setValue] = useState("pulse");

	return (
		<div
			className="flex w-full justify-center rounded-xl bg-[#07060b] py-10 text-[15px] tracking-tight text-white"
			style={{ "--ft-accent": "oklch(0.72 0.19 300)" } as CSSProperties}
		>
			<TickNav
				items={items}
				value={value}
				onValueChange={setValue}
				variant="neon"
				ariaLabel="Channels"
				sound
			/>
		</div>
	);
}
