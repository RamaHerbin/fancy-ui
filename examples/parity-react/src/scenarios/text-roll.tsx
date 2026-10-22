// Mirrors src/lib/components/docs/examples/text-roll/BasicUsage.svelte.
import { useState } from "react";
import { TextRoll, Switch } from "fancy-ui-react";

export default function Scenario() {
	const [yearly, setYearly] = useState(false);
	const price = yearly ? "$40" : "$50";
	return (
		<div className="flex w-full flex-col items-center gap-6 p-6">
			<div className="bg-card border-border flex w-full max-w-xs flex-col items-center gap-1 rounded-xl border p-6">
				<p className="text-muted-foreground text-sm">Pro plan</p>
				<p className="text-foreground flex items-baseline gap-1 text-4xl font-semibold">
					<TextRoll value={price} tabular live="polite" />
					<span className="text-muted-foreground text-base font-normal">/mo</span>
				</p>
				<p className="text-muted-foreground text-xs">
					{yearly ? "Billed annually" : "Billed monthly"}
				</p>
			</div>

			<Switch checked={yearly} onCheckedChange={setYearly}>
				Bill yearly, save 20%
			</Switch>
		</div>
	);
}
