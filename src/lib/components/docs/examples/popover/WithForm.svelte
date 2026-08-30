<script lang="ts">
	import { Popover } from "$lib/fancy-ui/popover";
	import { Button } from "$lib/fancy-ui/button";

	let open = $state(false);
	let email = $state("");
	let sent = $state("");

	function invite() {
		sent = email;
		email = "";
		open = false;
	}
</script>

<Popover sound bind:open class="w-[240px]">
	{#snippet trigger()}
		Invite a teammate
	{/snippet}

	<span class="text-[13px] font-semibold">Invite by email</span>
	<input
		bind:value={email}
		type="email"
		placeholder="email@example.com"
		class="border-input bg-background text-foreground w-full rounded-[8px] border px-3 py-[7px] text-[12px]"
	/>
	<Button size="sm" fullWidth onclick={invite}>Send invite</Button>
</Popover>

{#if sent}
	<p class="text-muted-foreground mt-2 text-[12px]">Invited {sent}.</p>
{/if}
