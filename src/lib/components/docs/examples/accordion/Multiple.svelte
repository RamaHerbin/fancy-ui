<script lang="ts">
	import {
		Accordion,
		AccordionItem,
		AccordionTrigger,
		AccordionContent,
	} from "$lib/fancy-ui/accordion";

	let value = $state<string[]>(["profile", "security"]);
</script>

<Accordion type="multiple" bind:value class="w-full max-w-md">
	<AccordionItem value="profile">
		<AccordionTrigger>Profile</AccordionTrigger>
		<AccordionContent>Your name, avatar and the address people can find you at.</AccordionContent>
	</AccordionItem>
	<AccordionItem value="notifications">
		<AccordionTrigger>Notifications</AccordionTrigger>
		<AccordionContent>Choose which events send an email and which stay in the app.</AccordionContent
		>
	</AccordionItem>
	<AccordionItem value="security">
		<AccordionTrigger>Security</AccordionTrigger>
		<AccordionContent>Password, two-factor authentication and signed-in devices.</AccordionContent>
	</AccordionItem>
	<AccordionItem value="billing" disabled>
		<AccordionTrigger>Billing</AccordionTrigger>
		<AccordionContent>Only workspace owners can see this section.</AccordionContent>
	</AccordionItem>
</Accordion>
