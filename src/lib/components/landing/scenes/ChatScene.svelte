<!--
	Scene 4 — a conversation surface. The one scene where the skin's *typography*
	does the heavy lifting: bubbles are plain surfaces, so what separates the
	skins here is font, radius and border weight rather than colour.
-->
<script lang="ts">
	import { Badge, Button, Input, Switch } from "$lib/cameleon";

	let draft = $state("Can it theme without a rebuild?");
	let streaming = $state(true);

	const threads = [
		{ who: "Design system", last: "Tokens landed on main", unread: 2 },
		{ who: "Ada Lovelace", last: "Sending the audit now", unread: 0 },
		{ who: "Release train", last: "v3.2 cut", unread: 5 },
	];
	let active = $state("Design system");

	const messages = [
		{ from: "them", who: "Ada", text: "We have four brands on one codebase. Is that realistic?" },
		{ from: "me", text: "Yes — one provider prop swaps the whole art direction." },
		{
			from: "them",
			who: "Ada",
			text: "Including borders and type, or just colour?",
		},
		{
			from: "me",
			text: "Everything. Tokens, per-part recipes, fonts, even the ornaments.",
		},
	];
</script>

<div class="grid gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
	<!-- Thread list -->
	<aside class="lp-card flex flex-col overflow-hidden rounded-[14px]">
		<div class="lp-hairline p-3">
			<Input placeholder="Search conversations" />
		</div>
		{#each threads as thread (thread.who)}
			{@const isActive = thread.who === active}
			<button
				type="button"
				onclick={() => (active = thread.who)}
				class="lp-hairline flex cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors last:border-0"
				class:lp-surface={isActive}
			>
				<span
					class="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[12px] font-bold"
					style="background:linear-gradient(135deg,var(--skin-purple,#8b7bff),var(--skin-blue,#5b8cff));color:#fff"
					aria-hidden="true"
				>
					{thread.who.slice(0, 1)}
				</span>
				<span class="min-w-0 flex-1">
					<span class="block truncate text-[13px] font-semibold">{thread.who}</span>
					<span class="lp-dim block truncate text-[12px]">{thread.last}</span>
				</span>
				{#if thread.unread}
					<Badge variant="purple">{thread.unread}</Badge>
				{/if}
			</button>
		{/each}
	</aside>

	<!-- Conversation -->
	<div class="lp-card flex flex-col overflow-hidden rounded-[14px]">
		<div class="lp-hairline flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
			<div>
				<p class="text-[14px] font-semibold">{active}</p>
				<p class="lp-dim text-[12px]">3 participants</p>
			</div>
			<div class="flex items-center gap-2 text-[12px]">
				<span class="lp-muted">Streaming</span>
				<Switch bind:checked={streaming} aria-label="Streaming replies" />
			</div>
		</div>

		<div class="flex flex-col gap-3 p-5">
			{#each messages as message, index (index)}
				<div class="flex" class:justify-end={message.from === "me"}>
					<div
						class="max-w-[78%] rounded-[14px] px-3.5 py-2.5 text-[13px] leading-relaxed"
						class:lp-surface={message.from === "them"}
						style={message.from === "me"
							? "background:linear-gradient(100deg,var(--skin-purple,#8b7bff),var(--skin-blue,#5b8cff));color:#fff"
							: undefined}
					>
						{#if message.who}
							<span class="lp-dim mb-0.5 block text-[11px] font-semibold">{message.who}</span>
						{/if}
						{message.text}
					</div>
				</div>
			{/each}

			{#if streaming}
				<div class="flex">
					<div class="lp-surface flex items-center gap-1.5 rounded-[14px] px-3.5 py-3">
						{#each [0, 1, 2] as dot (dot)}
							<span
								class="chat-dot h-[6px] w-[6px] rounded-full"
								style="background:var(--skin-page-fg,#f8fafc);animation-delay:{dot * 0.16}s"
							></span>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<div class="lp-hairline mt-auto flex items-end gap-2.5 border-t-0 p-4">
			<div class="min-w-0 flex-1"><Input bind:value={draft} placeholder="Write a message" /></div>
			<Button size="md">Send</Button>
		</div>
	</div>
</div>

<style>
	.chat-dot {
		animation: chatPulse 1.2s ease-in-out infinite;
		opacity: 0.35;
	}

	@keyframes chatPulse {
		0%,
		100% {
			opacity: 0.25;
			transform: translateY(0);
		}
		50% {
			opacity: 0.9;
			transform: translateY(-3px);
		}
	}

	/* cameleon.css clamps durations inside .cameleon-root, which flattens this to
	   a near-instant loop rather than stopping it — kill it outright instead. */
	@media (prefers-reduced-motion: reduce) {
		.chat-dot {
			animation: none;
			opacity: 0.5;
		}
	}
</style>
