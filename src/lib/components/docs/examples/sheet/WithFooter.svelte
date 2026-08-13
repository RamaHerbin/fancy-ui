<script lang="ts">
	import { Sheet } from "$lib/fancy-ui/sheet";
	import { Button } from "$lib/fancy-ui/button";
	import { Input } from "$lib/fancy-ui/input";

	let open = $state(false);
	let email = $state("");

	function send() {
		open = false;
	}
</script>

<Button onclick={() => (open = true)}>Invite a member</Button>

<Sheet
	bind:open
	title="Invite a member"
	description="Send an email invitation to join the workspace."
	{footer}
>
	<Input bind:value={email} type="email" placeholder="email@example.com" />
</Sheet>

{#snippet footer()}
	<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
	<Button onclick={send}>Invite</Button>
{/snippet}
