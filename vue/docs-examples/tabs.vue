<script setup lang="ts">
import { ref } from "vue";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "fancy-ui-vue";

const section = ref("account");
</script>

<template>
	<Tabs v-model:value="section" sound>
		<TabsList>
			<TabsTrigger value="account">Account</TabsTrigger>
			<TabsTrigger value="security">Security</TabsTrigger>
			<TabsTrigger value="billing">Billing</TabsTrigger>
		</TabsList>
		<TabsContent value="account">Manage your profile, name, and avatar.</TabsContent>
		<TabsContent value="security">Update your password and two-factor settings.</TabsContent>
		<TabsContent value="billing">View invoices and update your payment method.</TabsContent>
	</Tabs>
</template>
