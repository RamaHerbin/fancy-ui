<script lang="ts">
	import { Button, Skeleton, dismissToast, toast } from "fancy-ui-svelte";
	import { api as sharedApi, type Notification, type WorkspaceApi } from "$lib/data/api.js";
	import { strings } from "$lib/strings.js";
	import Avatar from "$lib/local/Avatar.svelte";
	import Badge from "$lib/local/Badge.svelte";
	import EmptyState from "$lib/local/EmptyState.svelte";
	import ErrorState from "$lib/local/ErrorState.svelte";
	import ScreenHeader from "$lib/shell/ScreenHeader.svelte";
	import { copy, unreadLabel } from "./copy.js";
	import { formatRelative } from "./format.js";
	import { createLoader } from "./load.svelte.js";

	let { api = sharedApi }: { api?: WorkspaceApi } = $props();
	const text = copy.notifications;

	const loader = createLoader(
		// svelte-ignore state_referenced_locally
		() => api.listNotifications(),
		(items) => items.length === 0
	);

	let items = $state<Notification[]>([]);
	let busy = $state(false);

	let loadedFor: unknown;
	$effect(() => {
		const state = loader.state;
		if (state.status === "loading" || state.status === "error") return;
		if (loadedFor === state.data) return;
		loadedFor = state.data;
		items = state.data.map((item) => ({ ...item }));
	});

	const unread = $derived(items.filter((item) => !item.read));

	function apply(changed: Notification[]) {
		const byId = new Map(changed.map((item) => [item.id, item]));
		items = items.map((item) => byId.get(item.id) ?? item);
	}

	function failed() {
		toast({ title: text.updateFailed, description: text.updateFailedBody, variant: "error" });
	}

	async function setRead(ids: string[], read: boolean): Promise<boolean> {
		if (busy) return false;
		busy = true;
		try {
			apply(await api.setNotificationsRead(ids, read));
			return true;
		} catch {
			failed();
			return false;
		} finally {
			busy = false;
		}
	}

	async function markAllRead() {
		const ids = unread.map((item) => item.id);
		if (ids.length === 0) return;
		if (!(await setRead(ids, true))) return;
		// One undo for the whole group, restoring exactly the ones just read.
		const toastId = toast({
			title: text.markedAllRead,
			variant: "success",
			action: {
				label: text.undo,
				onClick: () => {
					dismissToast(toastId);
					void setRead(ids, false);
				},
			},
		});
	}
</script>

<div
	data-screen="notifications"
	data-state={loader.state.status}
	aria-busy={loader.state.status === "loading"}
>
	<ScreenHeader screen="notifications" />

	{#if loader.state.status === "loading"}
		<div class="border-border bg-card flex flex-col gap-4 rounded-xl border p-4 md:p-5">
			{#each { length: 4 } as _, i (i)}
				<div class="flex items-center gap-3">
					<Skeleton
						variant="circle"
						class="size-9 shrink-0"
						label={i === 0 ? strings.states.loading : ""}
					/>
					<Skeleton variant="text" lines={2} label="" class="min-w-0 flex-1" />
				</div>
			{/each}
		</div>
	{:else if loader.state.status === "error"}
		<ErrorState
			title={strings.states.errorTitle}
			description={strings.states.errorBody}
			retryLabel={strings.states.retry}
			retryable={loader.state.error.retryable}
			retrying={loader.reloading}
			onretry={() => loader.reload()}
		/>
	{:else if items.length === 0}
		<EmptyState title={text.emptyTitle} description={text.emptyBody} />
	{:else}
		<div class="flex flex-col gap-4">
			<div class="flex flex-wrap items-center justify-between gap-2">
				{#if unread.length > 0}
					<Badge tone="info">{unreadLabel(unread.length)}</Badge>
				{:else}
					<Badge tone="success">{text.allCaughtUp}</Badge>
				{/if}
				{#if unread.length > 0}
					<Button variant="outline" size="sm" loading={busy} onclick={markAllRead}>
						{text.markAllRead}
					</Button>
				{/if}
			</div>

			<ul class="border-border bg-card divide-border divide-y rounded-xl border">
				{#each items as item (item.id)}
					<li class="flex flex-wrap items-start gap-3 p-4 sm:flex-nowrap" data-read={item.read}>
						<Avatar initials={item.actor?.initials ?? "•"} class="mt-0.5" />
						<div class="min-w-0 basis-[calc(100%-3.5rem)] sm:flex-1 sm:basis-0">
							<div class="flex flex-wrap items-center gap-2">
								<p class="text-sm {item.read ? 'font-normal' : 'font-semibold'}">{item.title}</p>
								{#if !item.read}
									<Badge tone="info">{text.unread}</Badge>
								{/if}
							</div>
							<p class="text-muted-foreground mt-0.5 text-sm">{item.body}</p>
							<p class="text-muted-foreground mt-1 text-xs">{formatRelative(item.createdAt)}</p>
						</div>
						<Button
							variant="ghost"
							size="sm"
							class="ml-12 shrink-0 sm:ml-0"
							disabled={busy}
							aria-label="{item.read ? text.markUnread : text.markRead}: {item.title}"
							onclick={() => setRead([item.id], !item.read)}
						>
							{item.read ? text.markUnread : text.markRead}
						</Button>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
