<script lang="ts">
	import type { Snippet } from 'svelte';
	import { LogOut } from '@lucide/svelte';

	interface Props {
		children: Snippet;
		data: { user: { username: string } | null };
	}

	let { children, data }: Props = $props();
</script>

<div class="flex h-screen flex-col overflow-hidden">
	{#if data.user}
		<div class="flex h-8 shrink-0 items-center justify-end gap-3 border-b border-border bg-muted/50 px-4 text-xs text-muted-foreground">
			<span>{data.user.username}</span>
			<form method="POST" action="/auth/logout">
				<button
					type="submit"
					class="inline-flex items-center gap-1 hover:text-foreground"
				>
					<LogOut class="h-3 w-3" />
					Logout
				</button>
			</form>
		</div>
	{/if}

	{@render children()}
</div>
