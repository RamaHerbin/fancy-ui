import { useState } from "react";
import { Button, Dialog } from "fancy-ui-react";

export function DialogExample() {
	const [open, setOpen] = useState(false);
	const [email, setEmail] = useState("");

	return (
		<Dialog
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
				onChange={(event) => setEmail(event.target.value)}
				placeholder="email@example.com"
				aria-label="Email address"
				className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm"
			/>
		</Dialog>
	);
}
