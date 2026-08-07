<script lang="ts">
	import { onMount } from "svelte";
	import { ChatPanel, ChatEmptyState } from "$lib/fancy-ui/chat-panel";
	import { ChatMessage, ChatMessageActions, ChatMessageAction } from "$lib/fancy-ui/chat-message";
	import {
		Composer,
		ComposerInput,
		ComposerSubmit,
		ComposerToolbar,
		ComposerModelPicker,
		ComposerAttachments,
		ComposerCommandMenu,
	} from "$lib/fancy-ui/composer";
	import { ReasoningPanel } from "$lib/fancy-ui/reasoning-panel";
	import { WebSearch } from "$lib/fancy-ui/web-search";
	import { ToolCall } from "$lib/fancy-ui/tool-call";
	import { Sources } from "$lib/fancy-ui/sources";
	import { PromptSuggestions } from "$lib/fancy-ui/prompt-suggestions";
	import { ThinkingIndicator } from "$lib/fancy-ui/thinking-indicator";
	import { ContextRing } from "$lib/fancy-ui/context-ring";
	import { TerminalBlock } from "$lib/fancy-ui/terminal-block";
	import { CodeDiff } from "$lib/fancy-ui/code-diff";
	import { ApprovalCard, type ApprovalState } from "$lib/fancy-ui/approval-card";
	import { ChatError } from "$lib/fancy-ui/chat-error";
	import type {
		AttachmentData,
		CommandItemData,
		ModelOptionData,
		SearchResultData,
		SourceData,
		TokenUsageData,
		ToolCallData,
	} from "$lib/fancy-ui/_internals/ai-types.js";

	// =========================================================================
	// The script
	//
	// Everything the fake agent says or does lives here as plain data, so the rig
	// below is nothing but timers moving between these constants.
	// =========================================================================

	const QUESTION = "How should a client retry a flaky upload endpoint without hammering it?";

	const REASONING = [
		"The question is about the retry policy, not about the upload itself.",
		"Three things decide it: how many attempts, how long to wait between them,",
		"and which failures are worth retrying at all.",
		"Backoff covers the middle one; jitter is what stops a whole fleet of clients",
		"from coming back in lockstep.",
		"I should check the current guidance before answering, then read what this client does today.",
	].join(" ");

	const SEARCH_QUERY = "exponential backoff jitter retry policy";

	const RESULTS: SearchResultData[] = [
		{
			id: "r1",
			title: "Backoff with jitter, in practice",
			url: "https://docs.example.dev/reliability/backoff",
			snippet:
				"Full jitter beats equal jitter once the client fleet is large and the failure is correlated.",
		},
		{
			id: "r2",
			title: "Retry budgets and the thundering herd",
			url: "https://www.example.org/papers/retry-budgets",
			snippet:
				"A budget caps the extra load a failing dependency can be asked to absorb by the clients waiting on it.",
		},
		{
			id: "r3",
			title: "Which status codes are worth retrying",
			url: "https://api.example.net/guides/idempotency",
			snippet:
				"Only idempotent requests and a short list of transient statuses belong inside a retry loop.",
		},
	];

	/** The same three documents, now cited under the answer they produced. */
	const SOURCES: SourceData[] = RESULTS.map((result) => ({
		id: result.id,
		title: result.title,
		url: result.url,
		snippet: result.snippet,
	}));

	const READ_INPUT = { path: "src/upload/client.ts", lines: "1-80" };

	const CALL_RUNNING: ToolCallData = {
		id: "call_read_client",
		name: "read_file",
		status: "running",
		input: READ_INPUT,
	};

	const CALL_DONE: ToolCallData = {
		id: "call_read_client",
		name: "read_file",
		status: "done",
		input: READ_INPUT,
		output: { attempts: 1, backoff: "none", idempotencyKey: false, retryableStatuses: [] },
		durationMs: 840,
	};

	const ANSWER = [
		"Three rules, in the order they matter.",
		"**Only retry what is safe to repeat.** A `PUT` carrying an idempotency key can go round the loop; a bare `POST` that creates a row cannot.",
		"**Back off, then break the pattern.** `base * 2 ** attempt` doubles the gap, and full jitter — picking uniformly from `[0, delay]` — is what keeps a fleet of clients from returning together.",
		"**Give the whole thing a budget.** Five attempts under a thirty-second ceiling is a policy; retrying until it works is an outage amplifier.",
		"Your client does none of this yet: one attempt, no ceiling, and no idempotency key on the request.",
	].join("\n\n");

	const SUGGESTIONS = [
		"Add backoff to the upload client",
		"Which of those sources is the primary one?",
		"Run the affected tests",
	];

	const TEST_COMMAND = "pnpm test src/upload";

	/** ANSI is read and coloured by the block; anything else in it is stripped. */
	const TEST_LINES = [
		"\u001b[90mrunning 2 files in src/upload\u001b[0m",
		"",
		" \u001b[32m✓\u001b[0m src/upload/queue.test.ts (4 tests) 121ms",
		" \u001b[31m✗\u001b[0m src/upload/client.test.ts (6 tests | 1 failed) 412ms",
		"   \u001b[31m→ retries a 503 with backoff\u001b[0m",
		"     \u001b[90mexpected 5 calls, received 1\u001b[0m",
		"",
		" \u001b[1;31mFiles  1 failed | 1 passed (2)\u001b[0m",
		"  Tests  9 passed | 1 failed (10)",
	];

	// Built from lines rather than a template literal so the tabs inside the patch
	// are the patch's own, not this file's indentation.
	const PATCH = [
		"diff --git a/src/upload/client.ts b/src/upload/client.ts",
		"--- a/src/upload/client.ts",
		"+++ b/src/upload/client.ts",
		"@@ -14,7 +14,15 @@ export async function upload(file: Blob) {",
		" \tconst body = new FormData();",
		' \tbody.append("file", file);',
		" ",
		'-\tconst res = await fetch(ENDPOINT, { method: "PUT", body });',
		"-\tif (!res.ok) throw new UploadError(res.status);",
		"-\treturn res.json();",
		"+\tfor (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {",
		"+\t\tconst res = await fetch(ENDPOINT, {",
		'+\t\t\tmethod: "PUT",',
		"+\t\t\tbody,",
		'+\t\t\theaders: { "idempotency-key": key },',
		"+\t\t});",
		"+\t\tif (res.ok) return res.json();",
		"+\t\tif (!RETRYABLE.has(res.status)) throw new UploadError(res.status);",
		"+\t\t// Full jitter: uniform in [0, delay], so a fleet never comes back in step.",
		"+\t\tawait sleep(Math.random() * Math.min(CEILING_MS, BASE_MS * 2 ** attempt));",
		"+\t}",
		"+\tthrow new UploadError(408);",
		" }",
	].join("\n");

	const REPLY_APPLIED = [
		"Patch applied. `upload()` now gives up after five attempts, waits a jittered `base * 2 ** attempt` between them, and refuses to retry anything that is not idempotent.",
		"The failing case passes on the next run.",
	].join(" ");

	const REPLY_DENIED = [
		"Left alone, then. The patch is still in the transcript above if you want to apply it by hand —",
		"nothing was written to `src/upload/client.ts`.",
	].join(" ");

	const PUBLISH = "Publish it to the staging bucket.";

	const RECOVERY = [
		"Back. The publish step reconnected and the staging bucket now holds the build;",
		"nothing else changed while the stream was down.",
	].join(" ");

	/** What a turn you send yourself gets back — there is no model behind this panel. */
	const CANNED = [
		"There is no model behind this composer, so your turn went to a timer instead.",
		"It stays in the transcript until the scripted conversation above loops back to the top.",
	].join(" ");

	/** Generic tiers, so the fixture says nothing about anyone's product line-up. */
	const MODELS: ModelOptionData[] = [
		{ id: "mini", label: "Mini", badge: "Fast", description: "Short answers, small context." },
		{ id: "pro", label: "Pro", description: "Deeper reasoning, slower." },
		{ id: "max", label: "Max", badge: "New", description: "Everything, when it matters." },
	];

	const COMMANDS: CommandItemData[] = [
		{ id: "tests", label: "/tests", description: "Run the affected suites", hint: "⌘⏎" },
		{ id: "diff", label: "/diff", description: "Show the working tree" },
		{ id: "cite", label: "/cite", description: "List the sources behind the last answer" },
		{ id: "reset", label: "/reset", description: "Start the thread again" },
	];

	// =========================================================================
	// Timing — one cycle is a little over half a minute
	// =========================================================================

	/** Between two words of a streamed reply, and of a streamed reasoning trace. */
	const WORD_MS = 38;
	const THOUGHT_MS = 34;
	/** Between two lines of command output. */
	const LINE_MS = 240;
	/** How long the panel sits empty before the first question lands. */
	const EMPTY_MS = 1200;
	/** How long the suggestions sit there before the script picks the first one. */
	const PICK_MS = 3000;
	/** How long the gate waits before the loop answers it for you. */
	const APPROVE_MS = 2000;
	/** How long the finished conversation is left to read before it restarts. */
	const HOLD_MS = 3000;
	/** How long a fake upload spends on each quarter of its progress bar. */
	const UPLOAD_MS = 220;

	// =========================================================================
	// The meter
	// =========================================================================

	/** Four characters to a token is close enough for a meter on a docs page. */
	const CHARS_PER_TOKEN = 4;
	const SYSTEM_TOKENS = 2_600;
	/** What one search hit costs once it has been read. */
	const RESULT_TOKENS = 240;
	/** The file the tool read, the test output, and the patch, in and out. */
	const TOOL_TOKENS = 620;
	const RUN_TOKENS = 460;
	const PATCH_TOKENS = 880;

	interface LiveTurn {
		id: string;
		role: "user" | "assistant";
		text: string;
	}

	// =========================================================================
	// State — the whole conversation, one flag at a time
	// =========================================================================

	let started = $state(false);
	let openedAt = $state<number | undefined>(undefined);

	let reasoningShown = $state(false);
	let reasoning = $state("");
	let reasoningStreaming = $state(false);
	let reasoningSince = $state<number | undefined>(undefined);
	let reasoningMs = $state<number | undefined>(undefined);

	let searchShown = $state(false);
	let searching = $state(false);
	let results = $state<SearchResultData[]>([]);

	let call = $state<ToolCallData | null>(null);

	let answerShown = $state(false);
	let answer = $state("");
	let answerStreaming = $state(false);
	let sourcesShown = $state(false);
	let suggestionsShown = $state(false);

	let secondTurn = $state<string | null>(null);
	let terminalShown = $state(false);
	let output = $state("");
	let running = $state(false);
	let exitCode = $state<number | null>(null);
	let diffShown = $state(false);
	let approvalShown = $state(false);
	let approval = $state<ApprovalState>("pending");
	let replyShown = $state(false);
	let reply = $state("");
	let replyStreaming = $state(false);

	let thirdTurnShown = $state(false);
	let errorShown = $state(false);
	let errorRetrying = $state(false);
	let recoveryShown = $state(false);
	let recovery = $state("");
	let recoveryStreaming = $state(false);

	let scriptStreaming = $state(false);
	let thinkingStatus = $state("Thinking");
	let thinkingSince = $state<number | undefined>(undefined);

	/** The live half: a draft you own, and the turns you send with it. */
	let draft = $state("");
	let attachments = $state<AttachmentData[]>([]);
	let model = $state("pro");
	let live = $state<LiveTurn[]>([]);
	let liveStreaming = $state(false);
	let liveReplyId = $state<string | null>(null);

	// Not reactive: bookkeeping the template never reads.
	type Timer = ReturnType<typeof setTimeout>;

	/** The script's own timers. A loop restart takes every one of these back. */
	const scriptTimers = new Set<Timer>();
	/**
	 * Yours: the reply to a turn you sent, and the chips you attached. They are
	 * deliberately in a second set, so a loop restart cannot cancel work that
	 * belongs to the reader rather than to the recording.
	 */
	const readerTimers = new Set<Timer>();

	let stopLiveReply: (() => void) | null = null;
	let restartTimer: Timer | null = null;
	let serial = 0;
	let gateResolved = false;
	let reduced = false;

	// =========================================================================
	// Derived
	// =========================================================================

	/** One flag for the panel's scroll pinning: script or reader, it is the same pin. */
	const busy = $derived(scriptStreaming || liveStreaming);

	/**
	 * The greeting stands in until there is a transcript — and a turn you sent in
	 * the second before the recording starts counts. Reading `started` alone would
	 * swap your own message out for the empty state until the script caught up.
	 */
	const empty = $derived(!started && live.length === 0);

	const modelLabel = $derived(MODELS.find((entry) => entry.id === model)?.label ?? MODELS[0].label);

	function tokens(text: string): number {
		return Math.ceil(text.length / CHARS_PER_TOKEN);
	}

	const transcriptTokens = $derived.by(() => {
		let total = started ? tokens(QUESTION) : 0;
		total += tokens(reasoning) + tokens(answer) + tokens(reply) + tokens(recovery);
		if (secondTurn !== null) total += tokens(secondTurn);
		if (thirdTurnShown) total += tokens(PUBLISH);
		for (const turn of live) total += tokens(turn.text);
		return total;
	});

	const attachedTokens = $derived.by(() => {
		let total = results.length * RESULT_TOKENS;
		if (call?.status === "done") total += TOOL_TOKENS;
		if (output !== "") total += RUN_TOKENS;
		if (diffShown) total += PATCH_TOKENS;
		return total;
	});

	// A small window on purpose: the ring should visibly fill as the conversation
	// runs, which it would not against a budget nothing in a demo can dent.
	const usage: TokenUsageData = $derived({
		used: SYSTEM_TOKENS + transcriptTokens + attachedTokens,
		max: 8_000,
		breakdown: [
			{ label: "System prompt", tokens: SYSTEM_TOKENS },
			{ label: "Transcript", tokens: transcriptTokens },
			{ label: "Search and tools", tokens: attachedTokens },
		],
	});

	// =========================================================================
	// The rig
	// =========================================================================

	/**
	 * Every timer in this file goes through here, into one of the two sets above,
	 * so a reset can take back exactly the ones the script owns and unmount can
	 * take back the rest. A fired timer removes itself, so neither set grows over
	 * a conversation that has looped fifty times.
	 */
	function schedule(into: Set<Timer>, fn: () => void, ms: number): Timer {
		const handle = setTimeout(() => {
			into.delete(handle);
			fn();
		}, ms);
		into.add(handle);
		return handle;
	}

	function later(fn: () => void, ms: number): Timer {
		return schedule(scriptTimers, fn, ms);
	}

	function cancel(handle: Timer | null): void {
		if (handle === null) return;
		clearTimeout(handle);
		scriptTimers.delete(handle);
		readerTimers.delete(handle);
	}

	function clearSet(set: Set<Timer>): void {
		for (const handle of set) clearTimeout(handle);
		set.clear();
	}

	/**
	 * Writes the whole text so far on every tick, never just the delta — that is
	 * the contract every streaming surface in this family reads. Returns its own
	 * stopper, so a stream can be cut without touching anyone else's timers.
	 */
	function streamWords(
		into: Set<Timer>,
		text: string,
		ms: number,
		write: (soFar: string) => void,
		done: () => void
	): () => void {
		const words = text.split(" ");
		let soFar = "";
		let i = 0;
		let handle: Timer | null = null;

		function step() {
			handle = null;
			if (i >= words.length) {
				done();
				return;
			}
			soFar = i === 0 ? words[0] : `${soFar} ${words[i]}`;
			write(soFar);
			i += 1;
			handle = schedule(into, step, ms);
		}

		handle = schedule(into, step, ms);

		return () => {
			cancel(handle);
			handle = null;
		};
	}

	function streamLines(lines: string[], ms: number, done: () => void): void {
		let i = 0;

		function step() {
			if (i >= lines.length) {
				done();
				return;
			}
			output = `${output}${lines[i]}\n`;
			i += 1;
			later(step, ms);
		}

		later(step, ms);
	}

	// -------------------------------------------------------------------------
	// First turn: think, search, read, answer, cite, offer
	// -------------------------------------------------------------------------

	function askQuestion(): void {
		started = true;
		scriptStreaming = true;
		thinkingStatus = "Reading the question";
		thinkingSince = Date.now();
		later(think, 400);
	}

	function think(): void {
		reasoningShown = true;
		reasoningStreaming = true;
		reasoningSince = Date.now();
		thinkingStatus = "Thinking";
		streamWords(
			scriptTimers,
			REASONING,
			THOUGHT_MS,
			(soFar) => (reasoning = soFar),
			() => {
				reasoningStreaming = false;
				reasoningMs = Date.now() - (reasoningSince ?? Date.now());
				// The panel folds itself 600ms after the trace stops, so the search
				// lands just as the summary line settles.
				later(search, 800);
			}
		);
	}

	function search(): void {
		searchShown = true;
		searching = true;
		thinkingStatus = "Searching the web";

		// Pushed one at a time: the list is keyed on the hit's id, so only the new
		// row plays its entrance and the ones already there stay put.
		RESULTS.forEach((result, i) => {
			later(() => (results = [...results, result]), 500 + i * 480);
		});

		later(
			() => {
				searching = false;
				later(readFile, 420);
			},
			500 + RESULTS.length * 480
		);
	}

	function readFile(): void {
		thinkingStatus = "Reading the client";
		call = CALL_RUNNING;
		later(() => {
			call = CALL_DONE;
			later(answerQuestion, 500);
		}, 900);
	}

	function answerQuestion(): void {
		thinkingStatus = "Writing";
		answerShown = true;
		answerStreaming = true;
		streamWords(
			scriptTimers,
			ANSWER,
			WORD_MS,
			(soFar) => (answer = soFar),
			() => {
				answerStreaming = false;
				scriptStreaming = false;
				later(() => {
					sourcesShown = true;
					later(() => {
						suggestionsShown = true;
						later(() => startSecondTurn(SUGGESTIONS[0]), PICK_MS);
					}, 700);
				}, 300);
			}
		);
	}

	// -------------------------------------------------------------------------
	// Second turn: run, patch, ask permission, report
	// -------------------------------------------------------------------------

	/**
	 * The loop and the suggestion row both come through here, and whichever
	 * arrives first wins: the other finds the turn already sent and stands down.
	 */
	function startSecondTurn(text: string): void {
		if (secondTurn !== null) return;
		secondTurn = text;
		suggestionsShown = false;
		scriptStreaming = true;
		thinkingStatus = "Planning the change";
		thinkingSince = Date.now();
		later(runTests, 900);
	}

	function runTests(): void {
		terminalShown = true;
		running = true;
		thinkingStatus = "Running the affected tests";
		streamLines(TEST_LINES, LINE_MS, () => {
			later(() => {
				running = false;
				exitCode = 1;
				later(showPatch, 600);
			}, 350);
		});
	}

	function showPatch(): void {
		diffShown = true;
		thinkingStatus = "Writing the patch";
		later(() => {
			approvalShown = true;
			thinkingStatus = "Waiting for approval";
			later(autoApprove, APPROVE_MS);
		}, 900);
	}

	/** The loop answers the gate for you — unless you already answered it yourself. */
	function autoApprove(): void {
		if (approval === "pending") approval = "approved";
		resolveGate();
	}

	function resolveGate(): void {
		if (gateResolved) return;
		gateResolved = true;
		later(reportBack, 500);
	}

	function reportBack(): void {
		replyShown = true;
		thinkingStatus = "Writing";
		scriptStreaming = true;
		replyStreaming = true;
		// The gate is real: a denial gets a different answer.
		const text = approval === "denied" ? REPLY_DENIED : REPLY_APPLIED;
		streamWords(
			scriptTimers,
			text,
			WORD_MS,
			(soFar) => (reply = soFar),
			() => {
				replyStreaming = false;
				scriptStreaming = false;
				later(publish, 900);
			}
		);
	}

	// -------------------------------------------------------------------------
	// Third turn: the one that fails
	// -------------------------------------------------------------------------

	function publish(): void {
		thirdTurnShown = true;
		scriptStreaming = true;
		thinkingStatus = "Publishing";
		thinkingSince = Date.now();
		later(() => {
			scriptStreaming = false;
			errorShown = true;
			holdThenRestart();
		}, 1400);
	}

	/** The last beat of the cycle, and the one a retry is allowed to postpone. */
	function holdThenRestart(): void {
		cancel(restartTimer);
		restartTimer = later(restart, HOLD_MS);
	}

	function retry(): void {
		if (errorRetrying) return;
		// The reader asked for the reply again; the loop can wait for it.
		cancel(restartTimer);
		restartTimer = null;
		errorRetrying = true;
		if (reduced) {
			finishRetry();
			return;
		}
		later(finishRetry, 800);
	}

	function finishRetry(): void {
		errorRetrying = false;
		errorShown = false;
		recoveryShown = true;
		if (reduced) {
			recovery = RECOVERY;
			return;
		}
		recoveryStreaming = true;
		scriptStreaming = true;
		streamWords(
			scriptTimers,
			RECOVERY,
			WORD_MS,
			(soFar) => (recovery = soFar),
			() => {
				recoveryStreaming = false;
				scriptStreaming = false;
				holdThenRestart();
			}
		);
	}

	// -------------------------------------------------------------------------
	// The loop
	// -------------------------------------------------------------------------

	function reset(): void {
		started = false;
		openedAt = Date.now() - 4 * 60 * 1000;

		reasoningShown = false;
		reasoning = "";
		reasoningStreaming = false;
		reasoningSince = undefined;
		reasoningMs = undefined;

		searchShown = false;
		searching = false;
		results = [];
		call = null;

		answerShown = false;
		answer = "";
		answerStreaming = false;
		sourcesShown = false;
		suggestionsShown = false;

		secondTurn = null;
		terminalShown = false;
		output = "";
		running = false;
		exitCode = null;
		diffShown = false;
		approvalShown = false;
		approval = "pending";
		gateResolved = false;
		replyShown = false;
		reply = "";
		replyStreaming = false;

		thirdTurnShown = false;
		errorShown = false;
		errorRetrying = false;
		recoveryShown = false;
		recovery = "";
		recoveryStreaming = false;

		scriptStreaming = false;
		thinkingStatus = "Thinking";
		thinkingSince = undefined;
		restartTimer = null;

		// The turns you sent belong to the thread being replayed, so they go with
		// it, and a reply still arriving for one of them is stopped rather than
		// left writing into an array that no longer holds its turn. Your draft and
		// your attachments stay: nothing here may take words out of your hands.
		stopLive();
		live = [];
	}

	function restart(): void {
		clearSet(scriptTimers);
		reset();
		later(askQuestion, EMPTY_MS);
	}

	/** Reduced motion gets the conversation it would have arrived at, all at once. */
	function showEverything(): void {
		started = true;
		openedAt = Date.now() - 4 * 60 * 1000;
		reasoningShown = true;
		reasoning = REASONING;
		reasoningMs = 2400;
		searchShown = true;
		results = [...RESULTS];
		call = CALL_DONE;
		answerShown = true;
		answer = ANSWER;
		sourcesShown = true;
		// The pills stay: nothing consumed them here, and a suggestion you press
		// still sends a turn — a live one, since the scripted second turn is in.
		suggestionsShown = true;
		secondTurn = SUGGESTIONS[0];
		terminalShown = true;
		output = `${TEST_LINES.join("\n")}\n`;
		exitCode = 1;
		diffShown = true;
		approvalShown = true;
		approval = "approved";
		gateResolved = true;
		replyShown = true;
		reply = REPLY_APPLIED;
		thirdTurnShown = true;
		errorShown = true;
	}

	// -------------------------------------------------------------------------
	// The live half
	// -------------------------------------------------------------------------

	function patchAttachment(id: string, next: Partial<AttachmentData>): void {
		attachments = attachments.map((entry) => (entry.id === id ? { ...entry, ...next } : entry));
	}

	function march(id: string): void {
		schedule(
			readerTimers,
			() => {
				const entry = attachments.find((item) => item.id === id);
				// The chip may have been removed mid-upload, and a fake upload with no
				// chip left to fill has nothing to do.
				if (!entry || entry.status !== "uploading") return;
				const progress = Math.min(1, (entry.progress ?? 0) + 0.25);
				patchAttachment(id, progress >= 1 ? { progress: 1, status: "done" } : { progress });
				if (progress < 1) march(id);
			},
			UPLOAD_MS
		);
	}

	/** The composer never uploads anything: it hands the files over and we do the rest. */
	function attach(files: File[]): void {
		for (const file of files) {
			serial += 1;
			const id = `file-${serial}`;
			attachments = [
				...attachments,
				{
					id,
					name: file.name,
					size: file.size,
					type: file.type,
					progress: reduced ? 1 : 0,
					status: reduced ? "done" : "uploading",
				},
			];
			if (!reduced) march(id);
		}
	}

	function sendLive(text: string): void {
		serial += 1;
		const replyId = `live-${serial}`;
		live = [
			...live,
			{ id: `you-${serial}`, role: "user", text },
			{ id: replyId, role: "assistant", text: reduced ? CANNED : "" },
		];
		if (reduced) return;

		stopLive();
		liveStreaming = true;
		liveReplyId = replyId;
		stopLiveReply = streamWords(
			readerTimers,
			CANNED,
			WORD_MS,
			(soFar) => {
				live = live.map((turn) => (turn.id === replyId ? { ...turn, text: soFar } : turn));
			},
			() => {
				stopLiveReply = null;
				liveStreaming = false;
				liveReplyId = null;
			}
		);
	}

	/** The composer's stop button, and what a loop restart does to a reply mid-flight. */
	function stopLive(): void {
		stopLiveReply?.();
		stopLiveReply = null;
		liveStreaming = false;
		liveReplyId = null;
	}

	function submitDraft(payload: { text: string; attachments: AttachmentData[] }): void {
		const files = payload.attachments;
		const label =
			payload.text || `${files.length} file${files.length === 1 ? "" : "s"}, and nothing else`;
		// The turn has really left, so its files go with it — the composer leaves
		// that call to us, since only we know whether an upload is still in flight.
		attachments = [];
		sendLive(files.length > 0 && payload.text ? `${label} (${files.length} attached)` : label);
	}

	/**
	 * A pill sends the scripted second turn while there is one to send, and a live
	 * turn afterwards — so no suggestion is ever a button that does nothing.
	 */
	function chooseSuggestion(text: string): void {
		if (secondTurn === null) {
			startSecondTurn(text);
			return;
		}
		suggestionsShown = false;
		sendLive(text);
	}

	async function copyAnswer(): Promise<void> {
		if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return;
		try {
			await navigator.clipboard.writeText(answer);
		} catch {
			// Denied permission or an insecure context: nothing to recover from.
		}
	}

	onMount(() => {
		reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		// A conversation that retypes itself every half minute is exactly the motion
		// this setting is asking us not to run, so it gets the finished thread.
		if (reduced) showEverything();
		else restart();

		return () => {
			clearSet(scriptTimers);
			clearSet(readerTimers);
		};
	});
</script>

<div class="h-[36rem] w-full max-w-2xl">
	<ChatPanel streaming={busy} {empty}>
		{#snippet header()}
			<div class="flex items-center gap-3 px-4 py-3">
				<div class="min-w-0 flex-1">
					<!--
						A paragraph rather than a heading: the panel is already a named
						region, and a heading here would file a demo's title in the page's
						contents.
					-->
					<p class="truncate text-sm font-semibold">Upload reliability</p>
					<p class="text-muted-foreground truncate font-mono text-xs">{modelLabel} · 8k window</p>
				</div>

				<!-- The pill is only there while there is something to report. -->
				{#if busy}
					<ThinkingIndicator variant="pill" status={thinkingStatus} since={thinkingSince} />
				{/if}

				<ContextRing {usage} size={26} strokeWidth={3} showLabel={false} expandable />
			</div>
		{/snippet}

		{#snippet emptyState()}
			<ChatEmptyState
				title="Upload reliability"
				description="A scripted thread that plays itself, and a composer that is really yours."
			/>
		{/snippet}

		<div class="flex flex-col gap-6 px-4 py-5">
			<!-- The recording. It only exists once the loop has started it, so a turn
			     you send in the second before that does not find a question above it
			     that nobody asked. -->
			{#if started}
				<ChatMessage role="user" content={QUESTION} timestamp={openedAt} avatar={youMark} />

				<!-- One assistant turn: what it thought, what it looked up, what it
				     read, what it said, what it cited, and what it offers next. -->
				<div class="flex flex-col gap-3">
					{#if reasoningShown}
						<ReasoningPanel
							text={reasoning}
							streaming={reasoningStreaming}
							since={reasoningSince}
							durationMs={reasoningMs}
							maxHeight="9rem"
						/>
					{/if}

					{#if searchShown}
						<WebSearch query={SEARCH_QUERY} {results} {searching} />
					{/if}

					{#if call}
						<!-- `open` is left alone, so the card stays folded: a call that
					     succeeded has nothing worth reading unasked. -->
						<ToolCall {call} />
					{/if}

					{#if answerShown}
						<ChatMessage
							role="assistant"
							content={answer}
							streaming={answerStreaming}
							markdown
							avatar={agentMark}
						>
							{#snippet actions()}
								<ChatMessageActions>
									<ChatMessageAction label="Copy answer" confirmLabel="Copied" onclick={copyAnswer}>
										<svg
											class="size-3.5"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
											aria-hidden="true"
										>
											<rect x="9" y="9" width="12" height="12" rx="2" />
											<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
										</svg>
									</ChatMessageAction>
								</ChatMessageActions>
							{/snippet}
						</ChatMessage>
					{/if}

					{#if sourcesShown}
						<Sources sources={SOURCES} />
					{/if}

					<!-- Never unmounted: `visible` is what replays the cascade, and a
				     component that is not there cannot replay anything. -->
					<PromptSuggestions
						suggestions={SUGGESTIONS}
						visible={suggestionsShown}
						onSelect={chooseSuggestion}
						label="Follow-up prompts"
					/>
				</div>

				{#if secondTurn !== null}
					<ChatMessage role="user" content={secondTurn} avatar={youMark} />

					<div class="flex flex-col gap-3">
						{#if terminalShown}
							<TerminalBlock
								command={TEST_COMMAND}
								{output}
								{running}
								{exitCode}
								durationMs={2410}
								maxHeight="11rem"
							/>
						{/if}

						{#if diffShown}
							<CodeDiff diff={PATCH} maxLines={14} />
						{/if}

						{#if approvalShown}
							<ApprovalCard
								title="Write the patch to src/upload/client.ts"
								description="Replaces the single fetch with a five-attempt loop. Nothing is committed and nothing is pushed."
								bind:state={approval}
								onApprove={resolveGate}
								onDeny={resolveGate}
							/>
						{/if}

						{#if replyShown}
							<ChatMessage
								role="assistant"
								content={reply}
								streaming={replyStreaming}
								markdown
								avatar={agentMark}
							/>
						{/if}
					</div>
				{/if}

				{#if thirdTurnShown}
					<ChatMessage role="user" content={PUBLISH} avatar={youMark} />
				{/if}

				{#if errorShown}
					<ChatError
						message="The assistant couldn't finish that reply"
						detail="stream_interrupted · request 8f21c0"
						onRetry={retry}
						retrying={errorRetrying}
					/>
				{/if}

				{#if recoveryShown}
					<ChatMessage
						role="assistant"
						content={recovery}
						streaming={recoveryStreaming}
						markdown
						avatar={agentMark}
					/>
				{/if}
			{/if}

			<!-- Everything below this line is yours: sent from the composer, or from
			     a suggestion pressed after the scripted turn had already gone. -->
			{#each live as turn (turn.id)}
				<ChatMessage
					role={turn.role}
					content={turn.text}
					streaming={turn.id === liveReplyId}
					markdown={turn.role === "assistant"}
					avatar={turn.role === "user" ? youMark : agentMark}
				/>
			{/each}
		</div>

		{#snippet composer()}
			<div class="p-3">
				<!-- `streaming` here is the live reply alone, never the script: a
				     recording playing back must not take the send button away. -->
				<Composer
					bind:value={draft}
					bind:attachments
					streaming={liveStreaming}
					onSubmit={submitDraft}
					onStop={stopLive}
					onAttach={attach}
				>
					{#snippet children()}
						<ComposerAttachments accept="image/*,.pdf,.md,.log" />

						<ComposerInput placeholder="Ask a follow-up — / for commands" maxRows={5} />

						<ComposerToolbar class="mt-2">
							<ComposerModelPicker models={MODELS} bind:value={model} />
							<div class="flex-1"></div>
							<ComposerSubmit />
						</ComposerToolbar>

						<ComposerCommandMenu trigger="/" items={COMMANDS} />
					{/snippet}
				</Composer>
			</div>
		{/snippet}
	</ChatPanel>
</div>

{#snippet youMark()}
	<span
		class="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-full text-xs font-semibold"
	>
		YOU
	</span>
{/snippet}

{#snippet agentMark()}
	<span
		class="flex size-8 items-center justify-center rounded-full bg-indigo-500/15 text-xs font-semibold text-indigo-500"
	>
		AI
	</span>
{/snippet}
