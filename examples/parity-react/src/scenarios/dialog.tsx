// Mirrors src/lib/components/docs/examples/dialog/BasicUsage.svelte.
import { useState } from "react";
import { Button, Dialog } from "fancy-ui-react";

export default function Scenario() {
	const [open, setOpen] = useState(false);
	const [email, setEmail] = useState("");

	return (
		<Dialog
			sound
			open={open}
			onOpenChange={setOpen}
			trigger={<Button>Invite member</Button>}
			footer={
				<>
					<Button variant="outline" onClick={() => setOpen(false)}>
						Cancel
					</Button>
					<Button onClick={() => setOpen(false)}>Invite</Button>
				</>
			}
			title="Invite a member"
			description="Send an email invite to join the workspace."
		>
			<input
				type="email"
				value={email}
				onChange={(e) => setEmail(e.target.value)}
				placeholder="email@example.com"
				aria-label="Email address"
				className="border-input bg-background text-muted-foreground placeholder:text-muted-foreground focus-visible:ring-ring/50 focus-visible:border-ring w-full rounded-lg border px-3 py-2 text-[12px] outline-none focus-visible:ring-2"
			/>
		</Dialog>
	);
}
