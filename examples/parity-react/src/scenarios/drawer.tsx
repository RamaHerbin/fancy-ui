// Mirrors src/lib/components/docs/examples/drawer/BasicUsage.svelte.
import { useState } from "react";
import { Button, Drawer } from "fancy-ui-react";

export default function Scenario() {
	const [open, setOpen] = useState(false);
	const [sortBy, setSortBy] = useState("recent");

	return (
		<>
			<Button onClick={() => setOpen(true)}>Open filters</Button>

			<Drawer
				sound
				open={open}
				onOpenChange={setOpen}
				title="Filters"
				description="Drag down to close."
			>
				<div className="flex flex-col gap-2">
					<label className="text-muted-foreground flex items-center gap-2 text-[13px]">
						<input
							type="radio"
							name="sort"
							value="recent"
							checked={sortBy === "recent"}
							onChange={() => setSortBy("recent")}
						/>
						Most recent
					</label>
					<label className="text-muted-foreground flex items-center gap-2 text-[13px]">
						<input
							type="radio"
							name="sort"
							value="popular"
							checked={sortBy === "popular"}
							onChange={() => setSortBy("popular")}
						/>
						Most popular
					</label>
				</div>
			</Drawer>
		</>
	);
}
