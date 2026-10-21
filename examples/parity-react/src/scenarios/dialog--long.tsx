// Parity variant for scripts/parity/states.mjs; mirrors
// src/routes/_parity/[slug]/variants/dialog--long.svelte.
import { useState } from "react";
import { Button, Dialog } from "fancy-ui-react";

export default function Scenario() {
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
			title="Invite a member to the workspace and every project it holds"
			description="Send an email invite to join the workspace. The invite stays valid for seven days, and the new member joins with the default role, which an admin can change at any time from the members page."
		>
			<input
				type="email"
				value={email}
				onChange={(e) => setEmail(e.target.value)}
				placeholder="email@example.com"
				aria-label="Email address"
				className="border-input bg-background text-muted-foreground placeholder:text-muted-foreground focus-visible:ring-ring/50 focus-visible:border-ring w-full rounded-lg border px-3 py-2 text-[12px] outline-none focus-visible:ring-2"
			/>
			<p className="text-muted-foreground text-[12px] leading-relaxed">
				Members can read every board in the workspace, comment on any card, and create boards of
				their own. They cannot change billing, remove other members or rename the workspace.
			</p>
			<p className="text-muted-foreground text-[12px] leading-relaxed">
				An invite is tied to the address it was sent to. Forwarding the email to someone else does
				not let them in; they will be asked to request their own invite instead.
			</p>
			<p className="text-muted-foreground text-[12px] leading-relaxed">
				If the address belongs to a domain your workspace already verified, the new member skips the
				approval queue and lands on the home board right after signing in.
			</p>
			<p className="text-muted-foreground text-[12px] leading-relaxed">
				Guests invited to a single project count toward the member limit only once they accept.
				Pending invites can be revoked from the members page until then.
			</p>
			<p className="text-muted-foreground text-[12px] leading-relaxed">
				Every invite is recorded in the audit log with the time it was sent, the person who sent it
				and, once accepted, the device used to sign in for the first time.
			</p>
			<p className="text-muted-foreground text-[12px] leading-relaxed">
				Need to invite many people at once? Paste a list of addresses separated by commas or new
				lines, and each one receives its own invite with the same role.
			</p>
		</Dialog>
	);
}
