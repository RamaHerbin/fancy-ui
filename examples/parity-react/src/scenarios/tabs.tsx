// Mirrors src/lib/components/docs/examples/tabs/BasicUsage.svelte.
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "fancy-ui-react";

export default function Scenario() {
	const [section, setSection] = useState("account");
	return (
		<Tabs sound value={section} onValueChange={setSection}>
			<TabsList>
				<TabsTrigger value="account">Account</TabsTrigger>
				<TabsTrigger value="security">Security</TabsTrigger>
				<TabsTrigger value="billing">Billing</TabsTrigger>
			</TabsList>
			<TabsContent value="account">Manage your profile, name, and avatar.</TabsContent>
			<TabsContent value="security">Update your password and two-factor settings.</TabsContent>
			<TabsContent value="billing">View invoices and update your payment method.</TabsContent>
		</Tabs>
	);
}
