<script lang="ts">
	import { onDestroy, tick } from "svelte";
	import { Button, Skeleton, dismissToast, toast } from "fancy-ui-svelte";
	import { api as sharedApi, type Notification, type WorkspaceApi } from "$lib/data/api.js";
	import { strings } from "$lib/strings.js";
	import Avatar from "$lib/local/Avatar.svelte";
	import Badge from "$lib/local/Badge.svelte";
	import EmptyState from "$lib/local/EmptyState.svelte";
	import ErrorState from "$lib/local/ErrorState.svelte";
	import ScreenHeader from "$lib/shell/ScreenHeader.svelte";
	import { clearedLabel, copy, markedReadLabel, unreadLabel } from "./copy.js";
	import { formatRelative } from "./format.js";
	import { createLoader } from "./load.svelte.js";
	import { undoable } from "./undo.js";

	let { api = sharedApi }: { api?: WorkspaceApi } = $props();
	const text = copy.notifications;

	const loader = createLoader(
		// svelte-ignore state_referenced_locally
		() => api.listNotifications(),
		(items) => items.length === 0
	);

	let items = $state<Notification[]>([]);
	// Cleared here, still waiting for their undo window to close.
	let hidden = $state<string[]>([]);
	let busy = $state(false);

	let loadedFor: unknown;
	$effect(() => {
		const state = loader.state;
		if (state.status === "loading" || state.status === "error") return;
		if (loadedFor === state.data) return;
		loadedFor = state.data;
		items = state.data.map((item) => ({ ...item }));
	});

	const visible = $derived(items.filter((item) => !hidden.includes(item.id)));
	const unread = $derived(visible.filter((item) => !item.read));
	const readOnes = $derived(visible.filter((item) => item.read));

	function apply(changed: Notification[]) {
		const byId = new Map(changed.map((item) => [item.id, item]));
		items = items.map((item) => byId.get(item.id) ?? item);
	}

	function setLocal(ids: string[], read: boolean) {
		items = items.map((item) => (ids.includes(item.id) ? { ...item, read } : item));
	}

	const isRead = (id: string) => items.some((item) => item.id === id && item.read);

	// After the screen is gone there is no one to tell about a failure.
	let leaving = false;
	function failed() {
		if (leaving) return;
		toast({ title: text.updateFailed, description: text.updateFailedBody, variant: "error" });
	}

	// One notification at a time is its own undo (the button flips back), so
	// it is sent at once.
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

	// The bulk actions are optimistic and grouped: the whole batch changes on
	// screen at once, one toast can undo it, and the call is only made once
	// that toast closes without an Undo (see ./undo.ts).
	const pending = new Set<string>();

	// A bulk button that has nothing left to act on unmounts while it holds
	// focus: hand focus to the next sensible control once the DOM caught up.
	let root = $state<HTMLElement>();
	async function focusAfterUpdate(...selectors: string[]) {
		await tick();
		for (const selector of selectors) {
			const target = root?.querySelector<HTMLElement>(selector);
			if (target) return target.focus();
		}
		document.getElementById("main")?.focus();
	}

	// Only read notifications can be cleared. One that is unread again (its
	// mark-read was undone, or it was flipped back) leaves any pending clear:
	// it shows again now and is never archived when that clear commits.
	function keepOnlyReadHidden() {
		hidden = hidden.filter(isRead);
	}

	// After a bulk action, focus goes to the list: never to the other bulk
	// button, where a second Enter would act on everything again.
	const AFTER_BULK = ["[data-notification-list]", "[data-bulk] button"];

	function markAllRead() {
		const ids = unread.map((item) => item.id);
		if (ids.length === 0) return;
		setLocal(ids, true);
		void focusAfterUpdate(...AFTER_BULK);
		const toastId = undoable({
			title: markedReadLabel(ids.length),
			undoLabel: text.undo,
			// Exactly the ones this batch read, unless one was flipped back since.
			onUndo: () => {
				pending.delete(toastId);
				setLocal(ids.filter(isRead), false);
				keepOnlyReadHidden();
				void focusAfterUpdate('[data-bulk="read"] button');
			},
			onCommit: () => {
				pending.delete(toastId);
				void commitRead(ids);
			},
		});
		pending.add(toastId);
	}

	async function commitRead(ids: string[]) {
		// One marked unread again during the window keeps its own choice.
		const still = ids.filter(isRead);
		if (still.length === 0) return;
		try {
			await api.setNotificationsRead(still, true);
		} catch {
			setLocal(still, false);
			keepOnlyReadHidden();
			failed();
		}
	}

	function clearRead() {
		const ids = readOnes.map((item) => item.id);
		if (ids.length === 0) return;
		hidden = [...hidden, ...ids];
		void focusAfterUpdate(...AFTER_BULK);
		const toastId = undoable({
			title: clearedLabel(ids.length),
			undoLabel: text.undo,
			onUndo: () => {
				pending.delete(toastId);
				hidden = hidden.filter((id) => !ids.includes(id));
				void focusAfterUpdate('[data-bulk="clear"] button');
			},
			onCommit: () => {
				pending.delete(toastId);
				void commitClear(ids);
			},
		});
		pending.add(toastId);
	}

	async function commitClear(ids: string[]) {
		// The same rule as commitRead: what is no longer read stays.
		const still = ids.filter(isRead);
		hidden = hidden.filter((id) => !ids.includes(id) || still.includes(id));
		if (still.length === 0) return;
		try {
			await api.archiveNotifications(still);
			items = items.filter((item) => !still.includes(item.id));
		} catch {
			failed();
		} finally {
			hidden = hidden.filter((id) => !still.includes(id));
		}
	}

	// Leaving the screen is not an undo: closing its toasts sends what is pending.
	onDestroy(() => {
		leaving = true;
		for (const toastId of [...pending]) dismissToast(toastId);
	});
</script>

<div
	bind:this={root}
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
	{:else if visible.length === 0}
		<EmptyState title={text.emptyTitle} description={text.emptyBody} />
	{:else}
		<div class="flex flex-col gap-4">
			<div class="flex flex-wrap items-center justify-between gap-2">
				{#if unread.length > 0}
					<Badge tone="info">{unreadLabel(unread.length)}</Badge>
				{:else}
					<Badge tone="success">{text.allCaughtUp}</Badge>
				{/if}
				<div class="flex flex-wrap gap-2" data-bulk-actions>
					{#if readOnes.length > 0}
						<span class="contents" data-bulk="clear">
							<Button variant="ghost" size="sm" disabled={busy} onclick={clearRead}>
								{text.clearRead}
							</Button>
						</span>
					{/if}
					{#if unread.length > 0}
						<span class="contents" data-bulk="read">
							<Button variant="outline" size="sm" disabled={busy} onclick={markAllRead}>
								{text.markAllRead}
							</Button>
						</span>
					{/if}
				</div>
			</div>

			<!-- Focusable from script only: where focus lands after a bulk action. -->
			<ul
				aria-label={text.listLabel}
				tabindex="-1"
				data-notification-list
				class="border-border bg-card divide-border focus-visible:ring-ring/50 divide-y rounded-xl border outline-none focus-visible:ring-[3px]"
			>
				{#each visible as item (item.id)}
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
