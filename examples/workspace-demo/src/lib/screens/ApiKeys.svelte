<script lang="ts" module>
	/** How long a revoked key can still be brought back, in milliseconds. */
	export const UNDO_WINDOW_MS = 6000;
</script>

<script lang="ts">
	import { onDestroy } from "svelte";
	import {
		Button,
		Checkbox,
		CopyButton,
		FormField,
		Input,
		Skeleton,
		dismissToast,
		toast,
	} from "fancy-ui-svelte";
	import {
		ApiError,
		api as sharedApi,
		type ApiKey,
		type ApiKeyScope,
		type WorkspaceApi,
	} from "$lib/data/api.js";
	import { API_KEY_SCOPES } from "$lib/data/mock.js";
	import { strings } from "$lib/strings.js";
	import Badge from "$lib/local/Badge.svelte";
	import Card from "$lib/local/Card.svelte";
	import EmptyState from "$lib/local/EmptyState.svelte";
	import ErrorState from "$lib/local/ErrorState.svelte";
	import ScreenHeader from "$lib/shell/ScreenHeader.svelte";
	import { copy } from "./copy.js";
	import { formatDate, formatRelative } from "./format.js";
	import { createLoader } from "./load.svelte.js";

	let { api = sharedApi }: { api?: WorkspaceApi } = $props();
	const text = copy.apiKeys;

	const loader = createLoader(
		// svelte-ignore state_referenced_locally
		() => api.listApiKeys(),
		(keys) => keys.length === 0
	);

	// The keys on screen: the answer, plus keys created here, minus the ones
	// revoked here. The loader's own data is never edited in place.
	let added = $state<ApiKey[]>([]);
	let removed = $state<string[]>([]);
	const baseKeys = $derived(
		loader.state.status === "ready" || loader.state.status === "empty" ? loader.state.data : []
	);
	const keys = $derived(
		[...added, ...baseKeys.filter((key) => !added.some((a) => a.id === key.id))].filter(
			(key) => !removed.includes(key.id)
		)
	);
	// Empty only until the first key exists, then the list takes over.
	const showEmpty = $derived(loader.state.status === "empty" && keys.length === 0 && !creating());

	let formOpen = $state(false);
	let name = $state("");
	let scopes = $state<ApiKeyScope[]>([]);
	let creatingNow = $state(false);
	let errors = $state<{ name?: string; scopes?: string }>({});
	let secret = $state<string | null>(null);

	function creating() {
		return formOpen || secret !== null;
	}

	function openForm() {
		name = "";
		scopes = [];
		errors = {};
		formOpen = true;
	}

	function toggleScope(scope: ApiKeyScope, on: boolean) {
		scopes = on ? [...scopes, scope] : scopes.filter((s) => s !== scope);
	}

	async function create(event: SubmitEvent) {
		event.preventDefault();
		if (creatingNow) return;
		creatingNow = true;
		errors = {};
		try {
			const created = await api.createApiKey({ name, scopes: [...scopes] });
			added = [created.key, ...added];
			secret = created.secret;
			formOpen = false;
			toast({ title: text.created, variant: "success" });
		} catch (error) {
			if (error instanceof ApiError && error.code === "invalid") {
				errors = { [error.field === "scopes" ? "scopes" : "name"]: error.message };
			} else {
				toast({ title: text.createFailed, variant: "error" });
			}
		} finally {
			creatingNow = false;
		}
	}

	// Revoking is optimistic and reversible for a few seconds: the row leaves
	// at once, the call is only made when the window closes without an Undo.
	interface Pending {
		key: ApiKey;
		timer: ReturnType<typeof setTimeout>;
		toastId: string;
	}
	const pending = new Map<string, Pending>();

	async function commit(key: ApiKey, notify: boolean) {
		pending.delete(key.id);
		try {
			await api.revokeApiKey(key.id);
		} catch (error) {
			if (error instanceof ApiError && error.code === "not_found") return;
			removed = removed.filter((id) => id !== key.id);
			if (notify) {
				toast({
					title: `${text.revokeFailed} ${key.name}`,
					description: text.revokeFailedBody,
					variant: "error",
				});
			}
		}
	}

	function revoke(key: ApiKey) {
		removed = [...removed, key.id];
		const toastId = toast({
			title: `${text.revoked} ${key.name}`,
			description: text.revokedBody,
			duration: UNDO_WINDOW_MS,
			action: { label: text.undo, onClick: () => undo(key.id) },
		});
		const timer = setTimeout(() => void commit(key, true), UNDO_WINDOW_MS);
		pending.set(key.id, { key, timer, toastId });
	}

	function undo(id: string) {
		const entry = pending.get(id);
		if (!entry) return;
		clearTimeout(entry.timer);
		pending.delete(id);
		dismissToast(entry.toastId);
		removed = removed.filter((removedId) => removedId !== id);
	}

	// Leaving the screen is not an undo: what was revoked stays revoked.
	onDestroy(() => {
		for (const entry of pending.values()) {
			clearTimeout(entry.timer);
			void commit(entry.key, false);
		}
	});
</script>

<div
	data-screen="api-keys"
	data-state={loader.state.status}
	aria-busy={loader.state.status === "loading"}
>
	<ScreenHeader screen="apiKeys">
		{#snippet actions()}
			{#if loader.state.status !== "loading" && loader.state.status !== "error" && !creating() && keys.length > 0}
				<Button onclick={openForm}>{text.create}</Button>
			{/if}
		{/snippet}
	</ScreenHeader>

	{#if loader.state.status === "loading"}
		<div class="border-border bg-card flex flex-col gap-4 rounded-xl border p-4 md:p-5">
			{#each { length: 3 } as _, i (i)}
				<Skeleton
					variant="text"
					lines={2}
					label={i === 0 ? strings.states.loading : ""}
					class="w-full"
				/>
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
	{:else}
		<div class="flex flex-col gap-4">
			{#if secret !== null}
				<Card title={text.secretTitle} description={text.secretBody}>
					<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
						<code
							data-testid="new-secret"
							class="bg-muted min-w-0 flex-1 rounded-md px-3 py-2 font-mono text-sm break-all"
							>{secret}</code
						>
						<CopyButton value={secret} variant="outline" />
					</div>
					<div class="mt-4 flex justify-end">
						<Button onclick={() => (secret = null)}>{text.secretDone}</Button>
					</div>
				</Card>
			{/if}

			{#if formOpen}
				<Card title={text.createHeading}>
					<form class="flex flex-col gap-4" onsubmit={create} novalidate>
						<FormField label={text.keyName} error={errors.name} required>
							<Input bind:value={name} placeholder={text.keyNamePlaceholder} />
						</FormField>
						<fieldset class="flex flex-col gap-2">
							<legend class="mb-1 text-sm font-medium">{text.scopes}</legend>
							{#each API_KEY_SCOPES as scope (scope)}
								<Checkbox
									checked={scopes.includes(scope)}
									onCheckedChange={(on) => toggleScope(scope, on)}
								>
									{scope}
								</Checkbox>
							{/each}
							{#if errors.scopes}
								<p class="text-destructive text-[12px]">{errors.scopes}</p>
							{/if}
						</fieldset>
						<div class="flex justify-end gap-2">
							<Button variant="ghost" onclick={() => (formOpen = false)}>{text.cancel}</Button>
							<Button type="submit" loading={creatingNow}>{text.createSubmit}</Button>
						</div>
					</form>
				</Card>
			{/if}

			{#if showEmpty}
				<EmptyState title={text.emptyTitle} description={text.emptyBody}>
					<Button onclick={openForm}>{text.emptyAction}</Button>
				</EmptyState>
			{:else if keys.length > 0}
				<ul
					aria-label={text.listLabel}
					class="border-border bg-card divide-border divide-y rounded-xl border"
				>
					{#each keys as key (key.id)}
						<li class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
							<div class="min-w-0">
								<p class="truncate text-sm font-medium">{key.name}</p>
								<p class="text-muted-foreground mt-0.5 font-mono text-xs break-all">
									{key.prefix}…{key.lastFour}
								</p>
								<div class="mt-2 flex flex-wrap items-center gap-1.5">
									{#each key.scopes as scope (scope)}
										<Badge tone={scope === "admin" ? "warning" : "neutral"}>{scope}</Badge>
									{/each}
								</div>
								<p class="text-muted-foreground mt-2 flex flex-wrap gap-x-2 text-xs">
									<span>Created {formatDate(key.createdAt)}</span>
									<span aria-hidden="true">·</span>
									<span>
										{key.lastUsedAt ? `Used ${formatRelative(key.lastUsedAt)}` : text.neverUsed}
									</span>
								</p>
							</div>
							<Button
								variant="outline"
								size="sm"
								class="self-start sm:self-center"
								aria-label="{text.revoke} {key.name}"
								onclick={() => revoke(key)}
							>
								{text.revoke}
							</Button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</div>
