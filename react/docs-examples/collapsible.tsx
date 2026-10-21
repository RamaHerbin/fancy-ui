import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "fancy-ui-react";

export function CollapsibleExample() {
	const [open, setOpen] = useState(false);

	return (
		<Collapsible open={open} onOpenChange={setOpen} className="w-full max-w-sm">
			<div className="flex items-center justify-between gap-4">
				<h4 className="text-sm font-semibold">3 repositories starred</h4>
				<CollapsibleTrigger className="rounded-md border px-3 py-1 text-sm">
					{open ? "Show less" : "Show more"}
				</CollapsibleTrigger>
			</div>
			<div className="mt-2 rounded-md border px-3 py-2 font-mono text-sm">fancy-ui/core</div>
			<CollapsibleContent>
				<div className="mt-2 flex flex-col gap-2">
					<div className="rounded-md border px-3 py-2 font-mono text-sm">fancy-ui/motion</div>
					<div className="rounded-md border px-3 py-2 font-mono text-sm">fancy-ui/registry</div>
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}
