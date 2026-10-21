// Parity variant for scripts/parity/states.mjs; mirrors
// src/routes/_parity/[slug]/variants/tabs--long.svelte.
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "fancy-ui-react";

export default function Scenario() {
	const [section, setSection] = useState("account");
	return (
		<div className="w-[560px]">
			<Tabs value={section} onValueChange={setSection}>
				<TabsList>
					<TabsTrigger value="account">Account</TabsTrigger>
					<TabsTrigger value="notifications">Notifications and alerts</TabsTrigger>
					<TabsTrigger value="security">Security and sign-in</TabsTrigger>
					<TabsTrigger value="billing">Billing and invoices</TabsTrigger>
					<TabsTrigger value="apps">Connected applications</TabsTrigger>
				</TabsList>
				<TabsContent value="account">Manage your profile, name, and avatar.</TabsContent>
				<TabsContent value="notifications">
					Choose which events send you an email, which ones only show up in the inbox, and which
					ones stay silent. Mentions, assignments and replies to your comments are on by default;
					digests go out every Monday morning in your own time zone, and can be paused for a week at
					a time while you are away.
				</TabsContent>
				<TabsContent value="security">Update your password and two-factor settings.</TabsContent>
				<TabsContent value="billing">View invoices and update your payment method.</TabsContent>
				<TabsContent value="apps">
					Review the applications that can read your workspace.
				</TabsContent>
			</Tabs>
		</div>
	);
}
