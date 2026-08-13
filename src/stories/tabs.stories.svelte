<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Tabs, TabsList, TabsTrigger, TabsContent } from "$lib/fancy-ui/tabs";

	const { Story } = defineMeta({
		title: "Navigation/Tabs",
		component: Tabs,
		tags: ["autodocs"],
		args: {
			value: "account",
			orientation: "horizontal",
			activation: "automatic",
			variant: "underline",
		},
		argTypes: {
			value: { control: "text", description: "The active tab's value" },
			orientation: {
				control: "select",
				options: ["horizontal", "vertical"],
				description: "The tablist's stacking axis and which arrow-key pair moves it",
			},
			activation: {
				control: "select",
				options: ["automatic", "manual"],
				description: "Whether arrowing to a trigger selects it immediately, or only moves focus",
			},
			variant: {
				control: "select",
				options: ["underline", "segmented"],
				description: "Accent underline, or a segmented pill rail",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<Tabs {...args}>
		<TabsList>
			<TabsTrigger value="account">Account</TabsTrigger>
			<TabsTrigger value="security">Security</TabsTrigger>
			<TabsTrigger value="billing">Billing</TabsTrigger>
		</TabsList>
		<TabsContent value="account">Manage your profile, name, and avatar.</TabsContent>
		<TabsContent value="security">Update your password and two-factor settings.</TabsContent>
		<TabsContent value="billing">View invoices and update your payment method.</TabsContent>
	</Tabs>
{/snippet}

{#snippet disabledTemplate(args: any)}
	<Tabs {...args}>
		<TabsList>
			<TabsTrigger value="starter">Starter</TabsTrigger>
			<TabsTrigger value="team" disabled>Team</TabsTrigger>
			<TabsTrigger value="enterprise">Enterprise</TabsTrigger>
		</TabsList>
		<TabsContent value="starter">Starter plan details.</TabsContent>
		<TabsContent value="team">Team plan details — requires an upgrade.</TabsContent>
		<TabsContent value="enterprise">Enterprise plan details.</TabsContent>
	</Tabs>
{/snippet}

{#snippet verticalTemplate(args: any)}
	<Tabs {...args}>
		<div class="flex gap-6">
			<TabsList>
				<TabsTrigger value="general">General</TabsTrigger>
				<TabsTrigger value="notifications">Notifications</TabsTrigger>
				<TabsTrigger value="advanced">Advanced</TabsTrigger>
			</TabsList>
			<div class="flex-1">
				<TabsContent value="general">General settings live here.</TabsContent>
				<TabsContent value="notifications">Choose what you get notified about.</TabsContent>
				<TabsContent value="advanced">Advanced, rarely-touched settings.</TabsContent>
			</div>
		</div>
	</Tabs>
{/snippet}

<Story name="Default" {template} />

<Story name="Segmented variant" {template} args={{ value: "preview", variant: "segmented" }} />

<Story name="Manual activation" {template} args={{ activation: "manual" }} />

<Story
	name="Vertical"
	template={verticalTemplate}
	args={{ value: "general", orientation: "vertical" }}
/>

<Story name="Disabled tab" template={disabledTemplate} args={{ value: "starter" }} />
