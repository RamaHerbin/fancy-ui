<script lang="ts">
	import { nanoid } from "nanoid";
	import { marked } from "marked";
	import { Send, RotateCcw, Trash2 } from "@lucide/svelte";
	import { SparklesText } from "$lib/fancy-ui/sparkles-text";
	import { GlowBorder } from "$lib/fancy-ui/glow-border";
	import { BorderBeam } from "$lib/fancy-ui/border-beam";
	import { TextGenerateEffect } from "$lib/fancy-ui/text-generate-effect";
	import { ShimmerButton } from "$lib/fancy-ui/shimmer-button";
	import { Meteors } from "$lib/fancy-ui/meteors";

	type Role = "user" | "assistant";
	interface Message {
		id: string;
		role: Role;
		content: string;
	}

	let messages = $state<Message[]>([]);
	let streamingContent = $state("");
	let isStreaming = $state(false);
	let error = $state<string | null>(null);
	let provider = $state<"openai" | "ollama">("openai");
	let selectedModel = $state("gpt-4o-mini");
	let inputValue = $state("");
	let messagesEnd: HTMLDivElement | undefined = $state();
	let welcomeKey = $state(0);

	$effect(() => {
		void streamingContent;
		void messages.length;
		messagesEnd?.scrollIntoView({ behavior: "smooth" });
	});

	$effect(() => {
		selectedModel = provider === "openai" ? "gpt-4o-mini" : "llama3.2";
	});

	function render(md: string): string {
		return marked.parse(md) as string;
	}

	const PROMPTS = [
		"What animated backgrounds are available?",
		"Show me a button with a shimmer or glow effect",
		"How do I add a BorderBeam to a card?",
		"What components work best for a hero section?",
		"I need a text animation for a heading",
	];

	const openaiModels = ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"];
	const ollamaModels = ["llama3.2", "llama3.1", "mistral", "phi3", "gemma2"];

	async function sendMessage(content: string) {
		if (!content.trim() || isStreaming) return;

		messages = [...messages, { id: nanoid(), role: "user", content: content.trim() }];
		inputValue = "";
		isStreaming = true;
		error = null;
		streamingContent = "";

		try {
			const response = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ messages, model: selectedModel, provider }),
			});

			if (!response.ok) {
				error = await response.text();
				return;
			}

			const reader = response.body!.getReader();
			const dec = new TextDecoder();

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				streamingContent += dec.decode(value, { stream: true });
			}

			messages = [...messages, { id: nanoid(), role: "assistant", content: streamingContent }];
			streamingContent = "";
		} catch (e) {
			error = e instanceof Error ? e.message : "An unexpected error occurred.";
		} finally {
			isStreaming = false;
		}
	}

	function retryLastMessage() {
		const lastUser = [...messages].reverse().find((m) => m.role === "user");
		if (!lastUser) return;
		const idx = messages.lastIndexOf(lastUser);
		messages = messages.slice(0, idx);
		error = null;
		sendMessage(lastUser.content);
	}

	function clearChat() {
		messages = [];
		streamingContent = "";
		error = null;
		welcomeKey++;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			sendMessage(inputValue);
		}
	}
</script>

<svelte:head>
	<title>Component Copilot — FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<!-- Header -->
	<div class="mb-6 text-center">
		<div class="mb-2 flex justify-center">
			<SparklesText text="Component Copilot" class="text-3xl font-bold" />
		</div>
		<p class="text-muted-foreground">
			Ask me anything about FancyUI components — I'll help you find, understand, and use them.
		</p>
	</div>

	<!-- Controls -->
	<div class="mb-4 flex flex-wrap items-center gap-3">
		<!-- Provider toggle -->
		<div class="bg-muted flex rounded-lg p-1 text-sm">
			<button
				class="rounded-md px-3 py-1.5 font-medium transition-colors {provider === 'openai'
					? 'bg-background text-foreground shadow-sm'
					: 'text-muted-foreground hover:text-foreground'}"
				onclick={() => (provider = "openai")}
			>
				OpenAI
			</button>
			<button
				class="rounded-md px-3 py-1.5 font-medium transition-colors {provider === 'ollama'
					? 'bg-background text-foreground shadow-sm'
					: 'text-muted-foreground hover:text-foreground'}"
				onclick={() => (provider = "ollama")}
			>
				Ollama
			</button>
		</div>

		<!-- Model select -->
		<select
			bind:value={selectedModel}
			class="bg-background border-input text-foreground rounded-lg border px-3 py-1.5 text-sm"
		>
			{#each provider === "openai" ? openaiModels : ollamaModels as model}
				<option value={model}>{model}</option>
			{/each}
		</select>

		<!-- Clear button -->
		{#if messages.length > 0}
			<button
				onclick={clearChat}
				class="text-muted-foreground hover:text-foreground ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors"
			>
				<Trash2 size={14} />
				Clear
			</button>
		{/if}
	</div>

	<!-- Chat window -->
	<div class="relative flex min-h-[500px] flex-col overflow-hidden rounded-xl border">
		<!-- Decorative glow -->
		<GlowBorder color={["#3b82f6", "#8b5cf6", "#ec4899"]} borderRadius={12} borderWidth={1} />

		<!-- Streaming indicator -->
		{#if isStreaming}
			<BorderBeam size={200} duration={2} />
		{/if}

		<!-- Messages area -->
		<div class="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
			{#if messages.length === 0 && !isStreaming}
				<!-- Empty state -->
				<div class="relative flex flex-1 flex-col items-center justify-center py-12">
					<Meteors count={8} class="pointer-events-none" />
					<div class="relative z-10 mb-8 max-w-lg text-center">
						{#key welcomeKey}
							<TextGenerateEffect
								words="Ask me about any FancyUI component — I can help you find the right one, show you how to use it, and explain the props."
								class="text-muted-foreground text-sm"
							/>
						{/key}
					</div>
					<div class="relative z-10 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
						{#each PROMPTS as prompt}
							<button
								onclick={() => sendMessage(prompt)}
								class="bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg px-3 py-2 text-left text-xs transition-colors"
							>
								{prompt}
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Message history -->
			{#each messages as msg (msg.id)}
				{#if msg.role === "user"}
					<div class="flex justify-end">
						<div class="bg-accent text-accent-foreground max-w-[80%] rounded-xl px-4 py-2 text-sm">
							{msg.content}
						</div>
					</div>
				{:else}
					<div class="flex justify-start">
						<div class="bg-card max-w-[85%] rounded-xl border px-4 py-2 text-sm">
							<div class="prose prose-sm dark:prose-invert max-w-none">
								{@html render(msg.content)}
							</div>
						</div>
					</div>
				{/if}
			{/each}

			<!-- Streaming bubble -->
			{#if isStreaming}
				<div class="flex justify-start">
					<div class="bg-card max-w-[85%] rounded-xl border px-4 py-2 text-sm">
						{#if streamingContent}
							<div class="prose prose-sm dark:prose-invert max-w-none">
								{@html render(streamingContent)}
							</div>
						{:else}
							<div class="flex gap-1">
								<span
									class="bg-muted-foreground/50 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:0ms]"
								></span>
								<span
									class="bg-muted-foreground/50 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:150ms]"
								></span>
								<span
									class="bg-muted-foreground/50 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:300ms]"
								></span>
							</div>
						{/if}
						{#if streamingContent}
							<span class="animate-pulse">▋</span>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Error state -->
			{#if error}
				<div class="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
					<p class="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>
					<ShimmerButton
						onclick={retryLastMessage}
						shimmerColor="#ef4444"
						background="rgba(239, 68, 68, 0.1)"
						class="text-sm"
					>
						<span class="flex items-center gap-1.5">
							<RotateCcw size={14} />
							Retry
						</span>
					</ShimmerButton>
				</div>
			{/if}

			<div bind:this={messagesEnd}></div>
		</div>

		<!-- Input area -->
		<div class="border-t p-3">
			<div class="flex gap-2">
				<textarea
					bind:value={inputValue}
					onkeydown={handleKeydown}
					placeholder="Ask about a component, describe your UI need..."
					rows={1}
					disabled={isStreaming}
					class="bg-background text-foreground placeholder:text-muted-foreground flex-1 resize-none rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/50 focus:outline-none disabled:opacity-50"
					style="field-sizing: content; max-height: 120px;"
				></textarea>
				<ShimmerButton
					onclick={() => sendMessage(inputValue)}
					disabled={isStreaming || !inputValue.trim()}
					class="self-end"
				>
					<span class="flex items-center gap-1.5 text-sm">
						<Send size={14} />
						Send
					</span>
				</ShimmerButton>
			</div>
			<p class="text-muted-foreground mt-1.5 px-1 text-xs">
				Enter to send · Shift+Enter for newline
			</p>
		</div>
	</div>
</div>
