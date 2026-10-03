<!--
	ChatComposition — an AI chat surface from the library's chat family, with
	seeded turns. Nothing streams and nothing is sent: the composer keeps the
	draft locally.
-->
<script lang="ts">
	import { ChatPanel } from "$lib/fancy-ui/chat-panel/index.js";
	import { ChatMessage } from "$lib/fancy-ui/chat-message/index.js";
	import { ThinkingIndicator } from "$lib/fancy-ui/thinking-indicator/index.js";
	import { Composer, ComposerInput, ComposerSubmit } from "$lib/fancy-ui/composer/index.js";

	let draft = $state("");
</script>

<div class="chat">
	<ChatPanel label="Example conversation">
		{#snippet header()}
			<div class="head">
				<span class="dot" aria-hidden="true"></span>
				Launch notes
			</div>
		{/snippet}

		<div class="turns">
			<ChatMessage
				role="user"
				content="Draft the changelog entry for the new pagination, two lines max."
			/>
			<ChatMessage
				role="assistant"
				content="Pagination now slides its active pill between pages and flips the digits as they change. Keyboard and reduced motion behave as before."
			/>
			<ThinkingIndicator status="Checking the release diff" elapsedMs={4200} />
		</div>

		{#snippet composer()}
			<div class="foot">
				<Composer bind:value={draft} onSubmit={() => (draft = "")}>
					<ComposerInput placeholder="Ask for a shorter version…" />
					<div class="row">
						<ComposerSubmit />
					</div>
				</Composer>
			</div>
		{/snippet}
	</ChatPanel>
</div>

<style>
	.chat {
		height: 100%;
	}

	.head {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px 16px;
		font-size: 13px;
		font-weight: 600;
	}

	.dot {
		width: 6px;
		height: 6px;
		border-radius: 999px;
		background: var(--g-green);
	}

	.turns {
		display: flex;
		flex-direction: column;
		gap: 18px;
		padding: 16px;
	}

	.foot {
		padding: 10px;
	}

	.row {
		display: flex;
		justify-content: flex-end;
		margin-top: 6px;
	}
</style>
