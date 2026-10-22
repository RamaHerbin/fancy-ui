"use client";

import { useEffect, useState } from "react";
import { Button, Dialog, RainbowButton } from "fancy-ui-react";

// The only client file of the /server route: it owns the handlers, because a
// function cannot be passed from a Server Component to a client component.
export function Island() {
	const [clicks, setClicks] = useState(0);
	const [open, setOpen] = useState(false);
	const [hydrated, setHydrated] = useState(false);
	useEffect(() => setHydrated(true), []);

	return (
		<section
			className="flex flex-wrap items-center gap-3"
			data-hydrated={hydrated ? "true" : undefined}
		>
			<RainbowButton data-testid="rainbow" onClick={() => setClicks((n) => n + 1)}>
				Rainbow
			</RainbowButton>
			<p data-testid="clicks">clicks: {clicks}</p>
			<Dialog
				open={open}
				onOpenChange={setOpen}
				trigger={<Button variant="outline">Open dialog</Button>}
				title="Island dialog"
				description="Its open state is reported through onOpenChange."
			>
				<p>Dialog body</p>
			</Dialog>
			<p data-testid="dialog-state">dialog: {open ? "open" : "closed"}</p>
		</section>
	);
}
