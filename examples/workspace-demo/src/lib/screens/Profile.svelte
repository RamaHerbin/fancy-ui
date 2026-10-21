<script lang="ts">
	import { onDestroy, tick } from "svelte";
	import {
		Button,
		FormField,
		Input,
		Select,
		Skeleton,
		StatusMorph,
		Textarea,
		dismissToast,
		toast,
		type StatusMorphProps,
	} from "fancy-ui-svelte";
	import { ApiError, api as sharedApi, type Profile, type WorkspaceApi } from "$lib/data/api.js";
	import { strings } from "$lib/strings.js";
	import Avatar from "$lib/local/Avatar.svelte";
	import Badge from "$lib/local/Badge.svelte";
	import Card from "$lib/local/Card.svelte";
	import EmptyState from "$lib/local/EmptyState.svelte";
	import ErrorState from "$lib/local/ErrorState.svelte";
	import ScreenHeader from "$lib/shell/ScreenHeader.svelte";
	import { copy } from "./copy.js";
	import { formatDate } from "./format.js";
	import { createLoader } from "./load.svelte.js";

	type SaveStatus = NonNullable<StatusMorphProps["state"]>;

	let { api = sharedApi }: { api?: WorkspaceApi } = $props();
	const text = copy.profile;

	// A profile with no handle, bio or location is a first launch.
	const loader = createLoader(
		// svelte-ignore state_referenced_locally
		() => api.getProfile(),
		(profile) => !profile.handle && !profile.bio && !profile.location
	);

	const TIMEZONES = [
		"America/New_York",
		"America/Los_Angeles",
		"Europe/Lisbon",
		"Europe/Paris",
		"Asia/Tokyo",
		"Australia/Sydney",
	].map((value) => ({ value, label: value.replace("_", " ") }));

	type Form = { name: string; handle: string; bio: string; location: string; timezone: string };

	let started = $state(false);
	let root = $state<HTMLElement>();
	// The first-launch action unmounts itself: hand focus to the form it reveals.
	async function start() {
		started = true;
		await tick();
		root?.querySelector<HTMLElement>("form input, form textarea")?.focus();
	}
	let saving = $state(false);
	let form = $state<Form>({ name: "", handle: "", bio: "", location: "", timezone: "" });
	let baseline = $state<Form>({ name: "", handle: "", bio: "", location: "", timezone: "" });
	let fieldErrors = $state<Partial<Record<keyof Form, string>>>({});

	function load(profile: Profile) {
		const next = {
			name: profile.name,
			handle: profile.handle,
			bio: profile.bio,
			location: profile.location,
			timezone: profile.timezone,
		};
		form = { ...next };
		baseline = { ...next };
	}

	// Fill the form once per answer, not on every keystroke.
	let loadedFor: unknown;
	$effect(() => {
		const state = loader.state;
		if (state.status === "loading" || state.status === "error") return;
		if (loadedFor === state.data) return;
		loadedFor = state.data;
		load(state.data);
	});

	const dirty = $derived(JSON.stringify(form) !== JSON.stringify(baseline));
	const profile = $derived(
		loader.state.status === "ready" || loader.state.status === "empty" ? loader.state.data : null
	);

	// Save and publish: the button carries the request's state (a ring while it
	// runs, a check only once the service answered, a cross when it did not),
	// and a failure offers Retry from its toast.
	let status = $state<SaveStatus>("idle");
	let failureToast: string | undefined;

	function closeFailure() {
		if (failureToast) dismissToast(failureToast);
		failureToast = undefined;
	}

	async function save(event?: SubmitEvent) {
		event?.preventDefault();
		if (saving || !dirty) return;
		saving = true;
		status = "loading";
		fieldErrors = {};
		closeFailure();
		try {
			const saved = await api.updateProfile({ ...form });
			loadedFor = saved;
			load(saved);
			loader.set(saved);
			// The check on the button, announced as "Profile saved", is the
			// confirmation: a toast on top would say it twice.
			status = "success";
		} catch (error) {
			if (error instanceof ApiError && error.code === "invalid" && error.field) {
				// Not a failed save: the answer is next to the field.
				status = "idle";
				fieldErrors = { [error.field]: error.message };
			} else {
				status = "error";
				failureToast = toast({
					title: text.saveFailed,
					description: text.saveFailedBody,
					variant: "error",
					action: { label: strings.actions.retry, onClick: () => void save() },
				});
			}
		} finally {
			saving = false;
		}
	}

	// Taking the screen away also takes its Retry away.
	onDestroy(closeFailure);
</script>

<div
	bind:this={root}
	data-screen="profile"
	data-state={loader.state.status}
	aria-busy={loader.state.status === "loading"}
>
	<ScreenHeader screen="profile" />

	{#if loader.state.status === "loading"}
		<div class="flex flex-col gap-4">
			<div class="border-border bg-card flex items-center gap-4 rounded-xl border p-4 md:p-5">
				<Skeleton variant="circle" class="size-16 shrink-0" label={strings.states.loading} />
				<Skeleton variant="text" lines={2} label="" class="min-w-0 flex-1" />
			</div>
			<div class="border-border bg-card flex flex-col gap-4 rounded-xl border p-4 md:p-5">
				{#each { length: 4 } as _, i (i)}
					<Skeleton variant="rect" label="" class="h-9 w-full" />
				{/each}
			</div>
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
	{:else if profile}
		<div class="flex flex-col gap-4">
			<Card title={text.identity}>
				<div class="flex items-center gap-4">
					<Avatar initials={profile.initials} name={profile.name} size="lg" />
					<div class="min-w-0">
						<p class="truncate text-lg font-semibold">{profile.name}</p>
						<p class="text-muted-foreground truncate text-sm">{profile.email}</p>
						<div class="mt-2 flex flex-wrap items-center gap-2">
							<Badge tone="info">{profile.role}</Badge>
							<span class="text-muted-foreground text-xs">
								{text.memberSince}
								{formatDate(profile.joinedAt)}
							</span>
						</div>
					</div>
				</div>
			</Card>

			{#if loader.state.status === "empty" && !started}
				<EmptyState title={text.emptyTitle} description={text.emptyBody}>
					<Button onclick={start}>{text.emptyAction}</Button>
				</EmptyState>
			{:else}
				<Card title={text.details} description={text.detailsHint}>
					<form class="flex flex-col gap-4" onsubmit={save} novalidate>
						<FormField label={text.name} error={fieldErrors.name} required>
							<Input bind:value={form.name} autocomplete="name" />
						</FormField>
						<FormField label={text.handle} error={fieldErrors.handle}>
							<Input bind:value={form.handle} autocomplete="username" />
						</FormField>
						<FormField label={text.bio} error={fieldErrors.bio}>
							<Textarea bind:value={form.bio} rows={3} />
						</FormField>
						<div class="grid gap-4 sm:grid-cols-2">
							<FormField label={text.location} error={fieldErrors.location}>
								<Input bind:value={form.location} />
							</FormField>
							<FormField label={text.timezone}>
								<Select
									bind:value={form.timezone}
									options={TIMEZONES}
									placeholder={text.timezonePlaceholder}
								/>
							</FormField>
						</div>
						<div class="flex justify-end">
							<Button type="submit" aria-busy={saving} disabled={!dirty && status !== "success"}>
								{text.save}
								{#snippet iconEnd()}
									<StatusMorph bind:state={status} labels={text.status} />
								{/snippet}
							</Button>
						</div>
					</form>
				</Card>
			{/if}
		</div>
	{/if}
</div>
