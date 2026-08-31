<script lang="ts">
	import { Drawer } from "$lib/fancy-ui/drawer";
	import { Button } from "$lib/fancy-ui/button";
	import { FormField } from "$lib/fancy-ui/form-field";
	import { Input } from "$lib/fancy-ui/input";
	import { Textarea } from "$lib/fancy-ui/textarea";

	let open = $state(false);
	let subject = $state("");
	let message = $state("");

	function submit() {
		open = false;
	}
</script>

<Button onclick={() => (open = true)}>Send feedback</Button>

<Drawer sound bind:open title="Send feedback" {footer}>
	<div class="flex flex-col gap-4">
		<FormField label="Subject">
			<Input bind:value={subject} placeholder="What's this about?" />
		</FormField>
		<FormField label="Message">
			<Textarea bind:value={message} placeholder="Tell us more..." />
		</FormField>
	</div>
</Drawer>

{#snippet footer()}
	<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
	<Button onclick={submit}>Submit</Button>
{/snippet}
