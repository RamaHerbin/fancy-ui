<script lang="ts">
	import { MatrixRain } from "$lib/fancy-ui/matrix-rain";
	import { TerminalText } from "$lib/fancy-ui/terminal-text";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";

	// ── Interactive terminal state ─────────────────────────────
	let terminalReady = $state(false);
	let inputValue = $state("");
	let history = $state<{ type: "cmd" | "output"; text: string }[]>([]);
	let inputEl: HTMLInputElement;
	let terminalBodyEl: HTMLDivElement;

	const RESPONSES: Record<string, string[] | (() => string[])> = {
		help: ["Available commands: help, whoami, ls, date, clear, hack, exit"],
		whoami: ["operator — clearance level: OMEGA"],
		ls: ["payload.enc  mainframe.key  rabbit.hole  /dev/null"],
		date: () => [new Date().toUTCString()],
		hack: [
			"initiating hack sequence...",
			"bypassing firewall... done",
			"injecting payload......... done",
			"you're in.",
		],
		exit: ["there is no exit."],
	};

	function handleCommand() {
		const cmd = inputValue.trim().toLowerCase();
		inputValue = "";
		if (!cmd) return;

		history = [...history, { type: "cmd", text: `operator@mainframe:~$ ${cmd}` }];

		if (cmd === "clear") {
			history = [];
			return;
		}

		const entry = RESPONSES[cmd];
		const lines =
			entry == null
				? [`bash: ${cmd}: command not found`]
				: typeof entry === "function"
					? entry()
					: entry;
		history = [...history, ...lines.map((text) => ({ type: "output" as const, text }))];

		// Scroll to bottom after DOM update
		setTimeout(() => {
			terminalBodyEl?.scrollTo({ top: terminalBodyEl.scrollHeight, behavior: "smooth" });
		}, 10);
	}

	function focusInput() {
		inputEl?.focus();
	}

	const heroLines = [
		"> initializing neural interface...",
		"> connecting to mainframe...",
		"> access granted. welcome, operator.",
		"> system status: all nodes online",
		"> awaiting input_",
	];

	const logLines = [
		"[INFO]  2077-04-02 03:14:07 — boot sequence complete",
		"[WARN]  memory fragmentation at sector 0x4A2F",
		"[INFO]  kernel patch applied successfully",
		"[ERROR] unauthorized access attempt from 192.168.0.42",
		"[INFO]  firewall rule updated — threat neutralized",
		"[OK]    all systems nominal",
	];

	const glitchLines = [
		"> scanning network topology...",
		"> found 1,337 vulnerable endpoints",
		"> deploying countermeasures...",
		"> done. the matrix has you.",
	];
</script>

<svelte:head>
	<title>MatrixRain + TerminalText — FancyUI</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-16 px-4 py-12">
	<div>
		<h1 class="mb-2 text-3xl font-bold">MatrixRain + TerminalText</h1>
		<p class="text-muted-foreground">
			Canvas-based falling glyph rain and a terminal-style text streamer — composable cyberpunk
			effects.
		</p>
	</div>

	<!-- =========================================================
		 1. HERO — MatrixRain canvas + TerminalText overlay
	========================================================== -->
	<section>
		<h2 class="mb-4 text-xl font-semibold">Composed: Hero</h2>
		<div class="relative h-64 w-full overflow-hidden rounded-lg">
			<MatrixRain class="absolute inset-0 h-full w-full" />
			<div class="absolute inset-0 flex items-center justify-center">
				<div class="rounded-md bg-black/70 p-6 text-green-400 backdrop-blur-sm">
					<TerminalText lines={heroLines} speed={45} />
				</div>
			</div>
		</div>
	</section>

	<!-- =========================================================
		 2. MatrixRain standalone + playground
	========================================================== -->
	<section>
		<h2 class="mb-4 text-xl font-semibold">MatrixRain</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Canvas-based falling katakana + latin glyph rain. Configurable via
			<code class="bg-muted rounded px-1.5 py-0.5">color</code>,
			<code class="bg-muted rounded px-1.5 py-0.5">speed</code>,
			<code class="bg-muted rounded px-1.5 py-0.5">density</code>, and
			<code class="bg-muted rounded px-1.5 py-0.5">glyphSize</code>.
		</p>

		<PropsPlayground
			controls={[
				{ key: "color", type: "color", label: "Color" },
				{ key: "speed", type: "range", label: "Speed", min: 0.2, max: 4, step: 0.1 },
				{ key: "density", type: "range", label: "Density", min: 0.5, max: 3, step: 0.1 },
				{ key: "glyphSize", type: "range", label: "Glyph Size (px)", min: 8, max: 32, step: 2 },
				{
					key: "fadeOpacity",
					type: "range",
					label: "Fade Opacity",
					min: 0.01,
					max: 0.3,
					step: 0.01,
				},
			]}
			initialValues={{
				color: "#00ff41",
				speed: 1.0,
				density: 1.0,
				glyphSize: 16,
				fadeOpacity: 0.05,
			}}
		>
			{#snippet preview(values)}
				<div class="h-64 w-full overflow-hidden rounded-lg">
					<MatrixRain
						color={values.color as string}
						speed={values.speed as number}
						density={values.density as number}
						glyphSize={values.glyphSize as number}
						fadeOpacity={values.fadeOpacity as number}
					/>
				</div>
			{/snippet}
		</PropsPlayground>
	</section>

	<!-- =========================================================
		 3. TerminalText standalone examples
	========================================================== -->
	<section>
		<h2 class="mb-4 text-xl font-semibold">TerminalText</h2>
		<div class="space-y-6">
			<!-- Log stream -->
			<div>
				<p class="text-muted-foreground mb-2 text-sm font-medium">Multiline log stream</p>
				<div class="rounded-lg border bg-black p-5 text-green-400">
					<TerminalText lines={logLines} speed={25} />
				</div>
			</div>

			<!-- Glitch enabled -->
			<div>
				<p class="text-muted-foreground mb-2 text-sm font-medium">With glitch effect</p>
				<div class="rounded-lg border bg-black p-5 text-green-400">
					<TerminalText lines={glitchLines} speed={50} glitch={true} />
				</div>
			</div>

			<!-- Fast, no cursor -->
			<div>
				<p class="text-muted-foreground mb-2 text-sm font-medium">Fast speed, no cursor</p>
				<div class="rounded-lg border bg-black p-5 text-cyan-400">
					<TerminalText
						lines={["> ping 8.8.8.8 — 3ms", "> traceroute complete", "> done."]}
						speed={15}
						cursor={false}
					/>
				</div>
			</div>
		</div>
	</section>

	<!-- =========================================================
		 4. Composed: Terminal Window (interactive)
	========================================================== -->
	<section>
		<h2 class="mb-4 text-xl font-semibold">Composed: Terminal Window</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			MatrixRain en fond, TerminalText pour l'intro, puis terminal interactif. Tape
			<code class="bg-muted rounded px-1.5 py-0.5">help</code> pour voir les commandes.
		</p>

		<div
			class="terminal-window rounded-lg border border-green-900 bg-black font-mono"
			role="button"
			tabindex="0"
			aria-label="Focus terminal input"
			onclick={focusInput}
			onkeydown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					focusInput();
				}
			}}
		>
			<!-- Title bar -->
			<div class="flex items-center gap-2 border-b border-green-900 px-4 py-2">
				<span class="h-3 w-3 rounded-full bg-red-500"></span>
				<span class="h-3 w-3 rounded-full bg-yellow-500"></span>
				<span class="h-3 w-3 rounded-full bg-green-500"></span>
				<span class="ml-2 text-xs text-green-700">operator@mainframe — bash</span>
			</div>

			<!-- Content area -->
			<div class="relative overflow-hidden" style="height: 320px;">
				<!-- Matrix rain behind -->
				<MatrixRain class="absolute inset-0 h-full w-full opacity-20" />
				<!-- Scanline overlay -->
				<div class="scanlines pointer-events-none absolute inset-0"></div>

				<!-- Scrollable terminal body -->
				<div bind:this={terminalBodyEl} class="absolute inset-0 overflow-y-auto p-4 text-green-400">
					{#if !terminalReady}
						<!-- Intro animation -->
						<TerminalText
							lines={[
								"> sudo access granted",
								"> loading encrypted payload...",
								"> decryption complete",
								"> WARNING: you are being watched",
								"> follow the white rabbit.",
							]}
							speed={60}
							delay={300}
							glitch={true}
							cursor={false}
							onComplete={() => {
								terminalReady = true;
								setTimeout(() => inputEl?.focus(), 50);
							}}
						/>
					{:else}
						<!-- History -->
						{#each history as entry}
							<div class="leading-relaxed {entry.type === 'cmd' ? 'text-white' : 'text-green-400'}">
								{entry.text}
							</div>
						{/each}

						<!-- Active prompt -->
						<div class="flex items-center gap-1 leading-relaxed">
							<span class="text-green-600">operator@mainframe:~$</span>
							<input
								bind:this={inputEl}
								bind:value={inputValue}
								class="min-w-0 flex-1 bg-transparent text-white caret-green-400 outline-none"
								spellcheck="false"
								autocomplete="off"
								onkeydown={(e) => e.key === "Enter" && handleCommand()}
							/>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</section>

	<!-- =========================================================
		 5. Props tables
	========================================================== -->
	<section class="space-y-8">
		<h2 class="mb-4 text-xl font-semibold">Props</h2>

		<div>
			<h3 class="mb-3 font-semibold">MatrixRain</h3>
			<div class="overflow-x-auto rounded-lg border">
				<table class="w-full text-sm">
					<thead class="bg-muted text-muted-foreground">
						<tr>
							<th class="px-4 py-2 text-left font-medium">Prop</th>
							<th class="px-4 py-2 text-left font-medium">Type</th>
							<th class="px-4 py-2 text-left font-medium">Default</th>
							<th class="px-4 py-2 text-left font-medium">Description</th>
						</tr>
					</thead>
					<tbody class="divide-y">
						{#each [["color", "string", '"#00ff41"', "Glyph and glow color"], ["speed", "number", "1.0", "Multiplier for fall speed"], ["density", "number", "1.0", "Column spacing multiplier"], ["glyphSize", "number", "16", "Font size in px"], ["fadeOpacity", "number", "0.05", "Trail fade per frame (lower = longer trails)"], ["class", "string", "—", "Additional CSS classes"]] as row}
							<tr class="hover:bg-muted/50">
								{#each row as cell, i}
									<td class="px-4 py-2{i < 2 ? ' font-mono text-xs' : ''}">{cell}</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<div>
			<h3 class="mb-3 font-semibold">TerminalText</h3>
			<div class="overflow-x-auto rounded-lg border">
				<table class="w-full text-sm">
					<thead class="bg-muted text-muted-foreground">
						<tr>
							<th class="px-4 py-2 text-left font-medium">Prop</th>
							<th class="px-4 py-2 text-left font-medium">Type</th>
							<th class="px-4 py-2 text-left font-medium">Default</th>
							<th class="px-4 py-2 text-left font-medium">Description</th>
						</tr>
					</thead>
					<tbody class="divide-y">
						{#each [["lines", "string[]", "required", "Lines to stream one by one"], ["speed", "number", "40", "Milliseconds per character"], ["delay", "number", "0", "Initial delay before streaming starts"], ["cursor", "boolean", "true", "Show blinking cursor"], ["cursorChar", "string", '"█"', "Cursor character"], ["glitch", "boolean", "false", "Enable random character glitch effect"], ["class", "string", "—", "Additional CSS classes"], ["onComplete", "() => void", "—", "Callback when all lines are done"]] as row}
							<tr class="hover:bg-muted/50">
								{#each row as cell, i}
									<td class="px-4 py-2{i < 2 ? ' font-mono text-xs' : ''}">{cell}</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</section>
</div>

<style>
	.scanlines {
		background: repeating-linear-gradient(
			to bottom,
			transparent,
			transparent 2px,
			rgba(0, 0, 0, 0.15) 2px,
			rgba(0, 0, 0, 0.15) 4px
		);
	}
</style>
