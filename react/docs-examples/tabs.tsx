import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "fancy-ui-react";

export function TabsExample() {
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
