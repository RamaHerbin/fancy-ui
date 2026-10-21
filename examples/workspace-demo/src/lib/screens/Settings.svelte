<script lang="ts">
	import { tick } from "svelte";
	import {
		Accordion,
		AccordionContent,
		AccordionItem,
		AccordionTrigger,
		Button,
		FormField,
		Input,
		Select,
		Skeleton,
		Switch,
		toast,
	} from "fancy-ui-svelte";
	import { api as sharedApi, type Settings, type WorkspaceApi } from "$lib/data/api.js";
	import { strings } from "$lib/strings.js";
	import EmptyState from "$lib/local/EmptyState.svelte";
	import ErrorState from "$lib/local/ErrorState.svelte";
	import ScreenHeader from "$lib/shell/ScreenHeader.svelte";
	import { copy } from "./copy.js";
	import { createLoader } from "./load.svelte.js";

	let { api = sharedApi }: { api?: WorkspaceApi } = $props();
	const text = copy.settings;

	// An unnamed workspace is the first launch.
	const loader = createLoader(
		// svelte-ignore state_referenced_locally
		() => api.getSettings(),
		(settings) => settings.workspaceName === ""
	);

	const LANGUAGES = [
		{ value: "en", label: "English" },
		{ value: "fr", label: "Français" },
		{ value: "es", label: "Español" },
		{ value: "pt", label: "Português" },
	];
	const DENSITIES = [
		{ value: "comfortable", label: "Comfortable" },
		{ value: "compact", label: "Compact" },
	];
	const DIGESTS = [
		{ value: "off", label: "Off" },
		{ value: "daily", label: "Daily" },
		{ value: "weekly", label: "Weekly" },
	];
	const TIMEOUTS = [
		{ value: "15", label: "15 minutes" },
		{ value: "30", label: "30 minutes" },
		{ value: "60", label: "1 hour" },
		{ value: "480", label: "8 hours" },
	];

	let started = $state(false);
	let root = $state<HTMLElement>();
	// The first-launch action unmounts itself: hand focus to the form it reveals.
	async function start() {
		started = true;
		await tick();
		root?.querySelector<HTMLElement>("form button")?.focus();
	}
	let saving = $state(false);
	let openSections = $state<string[]>(["general"]);
	let form = $state<Settings | null>(null);
	let baseline = $state<Settings | null>(null);

	let loadedFor: unknown;
	$effect(() => {
		const state = loader.state;
		if (state.status === "loading" || state.status === "error") return;
		if (loadedFor === state.data) return;
		loadedFor = state.data;
		form = { ...state.data };
		baseline = { ...state.data };
	});

	const dirty = $derived(JSON.stringify(form) !== JSON.stringify(baseline));
	const showForm = $derived(
		form !== null &&
			(loader.state.status === "ready" || (loader.state.status === "empty" && started))
	);

	// The timeout Select speaks strings; the setting is a number.
	const timeout = {
		get value() {
			return String(form?.sessionTimeoutMinutes ?? 60);
		},
		set value(next: string) {
			if (form) form.sessionTimeoutMinutes = Number(next);
		},
	};

	async function save(event: SubmitEvent) {
		event.preventDefault();
		if (saving || !dirty || !form) return;
		saving = true;
		try {
			const saved = await api.saveSettings({ ...form });
			loadedFor = saved;
			form = { ...saved };
			baseline = { ...saved };
			loader.set(saved);
			toast({ title: text.saved, variant: "success" });
		} catch {
			toast({ title: text.saveFailed, description: text.saveFailedBody, variant: "error" });
		} finally {
			saving = false;
		}
	}
</script>

<div
	bind:this={root}
	data-screen="settings"
	data-state={loader.state.status}
	aria-busy={loader.state.status === "loading"}
>
	<ScreenHeader screen="settings" />

	{#if loader.state.status === "loading"}
		<div class="border-border bg-card flex flex-col gap-4 rounded-xl border p-4 md:p-5">
			<Skeleton variant="text" lines={1} label={strings.states.loading} class="w-1/3" />
			{#each { length: 4 } as _, i (i)}
				<Skeleton variant="rect" label="" class="h-9 w-full" />
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
	{:else if loader.state.status === "empty" && !started}
		<EmptyState title={text.emptyTitle} description={text.emptyBody}>
			<Button onclick={start}>{text.emptyAction}</Button>
		</EmptyState>
	{:else if showForm && form}
		<form class="flex flex-col gap-4" onsubmit={save} novalidate>
			<Accordion
				type="multiple"
				bind:value={openSections}
				class="border-border bg-card divide-border divide-y rounded-xl border px-4 md:px-5"
			>
				<AccordionItem value="general">
					<AccordionTrigger headingLevel={2}>{text.general}</AccordionTrigger>
					<AccordionContent>
						<div class="flex flex-col gap-4 pb-4">
							<FormField label={text.workspaceName} description={text.generalHint}>
								<Input bind:value={form.workspaceName} />
							</FormField>
							<div class="grid gap-4 sm:grid-cols-2">
								<FormField label={text.language}>
									<Select bind:value={form.language} options={LANGUAGES} />
								</FormField>
								<FormField label={text.density}>
									<Select bind:value={form.density} options={DENSITIES} />
								</FormField>
							</div>
						</div>
					</AccordionContent>
				</AccordionItem>

				<AccordionItem value="notifications">
					<AccordionTrigger headingLevel={2}>{text.notifications}</AccordionTrigger>
					<AccordionContent>
						<div class="flex flex-col gap-4 pb-4">
							<FormField label={text.emailDigest}>
								<Select bind:value={form.emailDigest} options={DIGESTS} />
							</FormField>
							<Switch bind:checked={form.mentionsByEmail}>{text.mentionsByEmail}</Switch>
							<Switch bind:checked={form.productUpdates}>{text.productUpdates}</Switch>
						</div>
					</AccordionContent>
				</AccordionItem>

				<AccordionItem value="privacy">
					<AccordionTrigger headingLevel={2}>{text.privacy}</AccordionTrigger>
					<AccordionContent>
						<div class="flex flex-col gap-4 pb-4">
							<Switch bind:checked={form.publicProfile}>{text.publicProfile}</Switch>
							<Switch bind:checked={form.shareUsageData}>{text.shareUsageData}</Switch>
						</div>
					</AccordionContent>
				</AccordionItem>

				<AccordionItem value="security">
					<AccordionTrigger headingLevel={2}>{text.security}</AccordionTrigger>
					<AccordionContent>
						<div class="flex flex-col gap-4 pb-4">
							<Switch bind:checked={form.twoFactor}>{text.twoFactor}</Switch>
							<FormField label={text.sessionTimeout}>
								<Select bind:value={timeout.value} options={TIMEOUTS} />
							</FormField>
						</div>
					</AccordionContent>
				</AccordionItem>
			</Accordion>

			<div class="flex justify-end">
				<Button type="submit" loading={saving} disabled={!dirty}>{text.save}</Button>
			</div>
		</form>
	{/if}
</div>
