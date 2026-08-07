<script lang="ts">
	import { onMount } from "svelte";
	import {
		Composer,
		ComposerInput,
		ComposerSubmit,
		ComposerToolbar,
		ComposerModelPicker,
		ComposerAttachments,
		ComposerCommandMenu,
	} from "$lib/fancy-ui/composer";
	import { ContextRing } from "$lib/fancy-ui/context-ring";
	import { VoiceInput } from "$lib/fancy-ui/voice-input";
	import type {
		AttachmentData,
		CommandItemData,
		ModelOptionData,
		TokenUsageData,
	} from "$lib/fancy-ui/_internals/ai-types.js";

	/** Generic tiers, so the fixture says nothing about anyone's product line-up. */
	const MODELS: ModelOptionData[] = [
		{ id: "mini", label: "Mini", badge: "Fast", description: "Short answers, small context." },
		{ id: "pro", label: "Pro", description: "Deeper reasoning, slower." },
		{ id: "max", label: "Max", badge: "New", description: "Everything, when it matters." },
	];

	const COMMANDS: CommandItemData[] = [
		{ id: "deploy", label: "/deploy", description: "Ship the current branch", hint: "⌘⏎" },
		{ id: "describe", label: "/describe", description: "Summarise the diff" },
		{ id: "tests", label: "/tests", description: "Run the affected suites" },
		{ id: "reset", label: "/reset", description: "Clear the conversation" },
	];

	const PEOPLE: CommandItemData[] = [
		{ id: "jordan", label: "@jordan", description: "Reviewer" },
		{ id: "sam", label: "@sam", description: "On call" },
		{ id: "robin", label: "@robin", description: "Release manager" },
	];

	/** What the fake recogniser hears, one word at a time. */
	const HEARD = "add a retry with backoff to the release job";

	/** Tokens the system prompt is holding before anything is typed. */
	const SYSTEM_TOKENS = 1_850;
	/** What one attached file costs, roughly, once it has been read. */
	const FILE_TOKENS = 1_450;
	/** Four characters to a token is close enough for a meter on a docs page. */
	const CHARS_PER_TOKEN = 4;

	const UPLOAD_MS = 240;
	const REPLY_MS = 420;
	const WORD_MS = 34;
	const HEAR_MS = 180;

	interface Turn {
		id: string;
		role: "user" | "assistant";
		text: string;
	}

	let draft = $state("");
	let attachments = $state<AttachmentData[]>([]);
	let model = $state("pro");
	let streaming = $state(false);
	let recording = $state(false);
	let heard = $state("");
	let turns = $state<Turn[]>([]);

	let serial = 0;
	let timers: ReturnType<typeof setTimeout>[] = [];
	let reduced = false;

	/** Just the reply in flight, so stopping it leaves the rest of the demo alone. */
	let replyTimers: ReturnType<typeof setTimeout>[] = [];

	/** Every timer in this file goes through here, so unmount can take them all back. */
	function later(fn: () => void, ms: number) {
		timers.push(setTimeout(fn, ms));
	}

	/** A reply's own timer: tracked twice, so `halt` can cancel it and unmount still can. */
	function laterReply(fn: () => void, ms: number) {
		const timer = setTimeout(fn, ms);
		timers.push(timer);
		replyTimers.push(timer);
	}

	// -------------------------------------------------------------------------
	// The meter
	// -------------------------------------------------------------------------

	function tokens(text: string): number {
		return Math.ceil(text.length / CHARS_PER_TOKEN);
	}

	const historyTokens = $derived(turns.reduce((total, turn) => total + tokens(turn.text), 0));
	const draftTokens = $derived(tokens(draft));
	const fileTokens = $derived(attachments.length * FILE_TOKENS);

	// A small window on purpose: the ring should visibly move when you attach a
	// file, which it would not on a budget nothing in a demo can dent.
	const usage: TokenUsageData = $derived({
		used: SYSTEM_TOKENS + historyTokens + draftTokens + fileTokens,
		max: 16_000,
		breakdown: [
			{ label: "System prompt", tokens: SYSTEM_TOKENS },
			{ label: "Transcript", tokens: historyTokens },
			{ label: "Attachments", tokens: fileTokens },
			{ label: "Draft", tokens: draftTokens },
		],
	});

	// -------------------------------------------------------------------------
	// The fake upload
	// -------------------------------------------------------------------------

	function patch(id: string, next: Partial<AttachmentData>) {
		attachments = attachments.map((entry) => (entry.id === id ? { ...entry, ...next } : entry));
	}

	function march(id: string) {
		later(() => {
			const entry = attachments.find((item) => item.id === id);
			// The chip may have been removed mid-upload, and a fake upload with no
			// chip left to fill has nothing to do.
			if (!entry || entry.status !== "uploading") return;
			const progress = Math.min(1, (entry.progress ?? 0) + 0.2);
			patch(id, progress >= 1 ? { progress: 1, status: "done" } : { progress });
			if (progress < 1) march(id);
		}, UPLOAD_MS);
	}

	/**
	 * The composer never uploads anything: it hands the picked files over and the
	 * consumer pushes onto `attachments` once the upload has an id for them.
	 */
	function attach(files: File[]) {
		for (const file of files) {
			serial += 1;
			const id = `${file.name}#${serial}`;
			const entry: AttachmentData = {
				id,
				name: file.name,
				size: file.size,
				type: file.type,
				progress: reduced ? 1 : 0,
				status: reduced ? "done" : "uploading",
			};
			attachments = [...attachments, entry];
			// A progress bar creeping across a chip is motion; reduced motion gets
			// the finished upload instead, which is where it was heading anyway.
			if (!reduced) march(id);
		}
	}

	// -------------------------------------------------------------------------
	// The fake model
	// -------------------------------------------------------------------------

	function replyFor(prompt: string): string {
		return `Nothing is wired up behind this composer — “${prompt.slice(0, 60)}” went nowhere. The reply is on a timer, and the ring above counts this sentence against the window as it arrives.`;
	}

	function stream(prompt: string) {
		const words = replyFor(prompt).split(" ");
		serial += 1;
		const id = `assistant-${serial}`;

		turns = [...turns, { id, role: "assistant", text: reduced ? words.join(" ") : "" }];
		if (reduced) return;

		streaming = true;
		let i = 0;

		function chunk() {
			if (i >= words.length) {
				streaming = false;
				return;
			}
			const word = words[i];
			turns = turns.map((turn) =>
				turn.id === id ? { ...turn, text: turn.text === "" ? word : `${turn.text} ${word}` } : turn
			);
			i += 1;
			laterReply(chunk, WORD_MS);
		}

		laterReply(chunk, REPLY_MS);
	}

	function send(payload: { text: string; attachments: AttachmentData[] }) {
		const files = payload.attachments;
		const label =
			payload.text || `${files.length} file${files.length === 1 ? "" : "s"}, and nothing else`;
		serial += 1;
		turns = [...turns, { id: `user-${serial}`, role: "user", text: label }];
		// The turn has really left, so its files go with it — the composer leaves
		// that call to us, since only we know whether an upload is still in flight.
		attachments = [];
		stream(payload.text || label);
	}

	function halt() {
		// Only the reply: an upload or a transcription running alongside it has
		// nothing to do with the answer being stopped, and cancelling their timers
		// would leave their chips frozen mid-progress.
		for (const timer of replyTimers) clearTimeout(timer);
		replyTimers = [];
		streaming = false;
	}

	// -------------------------------------------------------------------------
	// The fake microphone
	// -------------------------------------------------------------------------

	function startVoice() {
		recording = true;
		heard = reduced ? HEARD : "";
		if (reduced) return;

		const words = HEARD.split(" ");
		let i = 0;

		function next() {
			// A cancelled recording stops being transcribed.
			if (!recording || i >= words.length) return;
			heard = i === 0 ? words[0] : `${heard} ${words[i]}`;
			i += 1;
			later(next, HEAR_MS);
		}

		later(next, HEAR_MS);
	}

	/** Confirmed: what was heard joins the draft, where it can still be edited. */
	function keepVoice() {
		draft = draft === "" ? heard : `${draft} ${heard}`;
		heard = "";
	}

	function dropVoice() {
		heard = "";
	}

	onMount(() => {
		reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		// Nothing here autoplays — every timer above is started by something you did
		// — so reduced motion changes only how the fake work lands: all at once
		// rather than in steps.
		return () => {
			for (const timer of timers) clearTimeout(timer);
			timers = [];
		};
	});
</script>

<div class="flex w-full max-w-2xl flex-col gap-3 p-6">
	{#each turns as turn (turn.id)}
		{#if turn.role === "user"}
			<div
				class="bg-primary text-primary-foreground ml-auto max-w-[85%] rounded-2xl rounded-br-sm px-4 py-2.5"
			>
				<p class="text-sm leading-relaxed">{turn.text}</p>
			</div>
		{:else}
			<div class="bg-muted text-foreground mr-auto max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-3">
				<p class="text-sm leading-relaxed">{turn.text}</p>
			</div>
		{/if}
	{/each}

	<Composer
		bind:value={draft}
		bind:attachments
		{streaming}
		onSubmit={send}
		onStop={halt}
		onAttach={attach}
		accessory={recording ? voicePanel : undefined}
	>
		{#snippet children()}
			<ComposerAttachments accept="image/*,.pdf,.md" />

			<ComposerInput placeholder="Ask anything — / for commands, @ to mention" maxRows={6} />

			<ComposerToolbar class="mt-2">
				<ComposerModelPicker models={MODELS} bind:value={model} />

				<button
					type="button"
					class="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors focus-visible:ring-1 focus-visible:outline-none"
					aria-label="Start voice input"
					title="Start voice input"
					onclick={startVoice}
				>
					<svg
						class="size-4"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.75"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
						<path d="M19 10v2a7 7 0 0 1-14 0v-2" />
						<path d="M12 19v3" />
					</svg>
				</button>

				<!-- The spacer is the split: everything after it sits on the right. -->
				<div class="flex-1"></div>

				<ContextRing {usage} size={22} strokeWidth={3} showLabel={false} expandable />
				<ComposerSubmit />
			</ComposerToolbar>

			<!-- Two menus, one draft: each answers only to its own trigger character,
			     so only one of them can ever be on screen. -->
			<ComposerCommandMenu trigger="/" items={COMMANDS} />
			<ComposerCommandMenu trigger="@" items={PEOPLE} />
		{/snippet}
	</Composer>

	<p class="text-muted-foreground text-xs">
		Type <code>/</code> for commands or <code>@</code> to mention someone — arrows move, Enter or Tab
		completes, Escape dismisses that token. The paperclip runs a fake upload, the ring counts the draft
		against a small window, and the microphone covers the composer with the accessory overlay.
	</p>
</div>

{#snippet voicePanel()}
	<!-- The accessory is a plain layer over the composition, not a focus trap:
	     what it holds and how it is dismissed are the consumer's to decide. -->
	<div class="bg-background flex h-full items-center rounded-xl border p-2">
		<VoiceInput
			bind:active={recording}
			transcript={heard}
			demo
			height={40}
			class="w-full"
			onStop={keepVoice}
			onCancel={dropVoice}
		/>
	</div>
{/snippet}
