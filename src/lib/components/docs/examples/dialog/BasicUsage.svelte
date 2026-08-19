<script lang="ts">
	import { Dialog } from "$lib/fancy-ui/dialog";
	import { Button } from "$lib/fancy-ui/button";

	let open = $state(false);
	let email = $state("");
</script>

{#snippet trigger()}
	<Button>Invite member</Button>
{/snippet}

{#snippet footer()}
	<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
	<Button onclick={() => (open = false)}>Invite</Button>
{/snippet}

<Dialog
	bind:open
	{trigger}
	{footer}
	title="Invite a member"
	description="Send an email invite to join the workspace."
>
	<input
		type="email"
		bind:value={email}
		placeholder="email@example.com"
		aria-label="Email address"
		class="border-input bg-background text-muted-foreground placeholder:text-muted-foreground focus-visible:ring-ring/50 focus-visible:border-ring w-full rounded-lg border px-3 py-2 text-[12px] outline-none focus-visible:ring-2"
	/>
</Dialog>
