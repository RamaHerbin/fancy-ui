<script lang="ts">
	import { Tabs, TabsList, TabsTrigger, TabsContent } from "$lib/fancy-ui/tabs";

	let section = $state("account");
</script>

<Tabs bind:value={section}>
	<TabsList>
		<TabsTrigger value="account">Account</TabsTrigger>
		<TabsTrigger value="security">Security</TabsTrigger>
		<TabsTrigger value="billing">Billing</TabsTrigger>
	</TabsList>
	<TabsContent value="account">Manage your profile, name, and avatar.</TabsContent>
	<TabsContent value="security">Update your password and two-factor settings.</TabsContent>
	<TabsContent value="billing">View invoices and update your payment method.</TabsContent>
</Tabs>
