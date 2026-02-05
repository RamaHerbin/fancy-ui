<script lang="ts">
	import { Dock, DockIcon, DockSeparator } from '$lib/fancy-ui/dock';
</script>

<svelte:head>
	<title>Dock - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl py-12 px-4">
	<h1 class="text-3xl font-bold mb-2">Dock</h1>
	<p class="text-muted-foreground mb-8">
		A macOS-style dock with icon magnification on hover. Icons grow larger as the cursor approaches them.
	</p>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Basic Usage</h2>
		<div class="rounded-lg border bg-card p-6 flex justify-center">
			<Dock>
				<DockIcon>
					<svg class="size-full" viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
					</svg>
				</DockIcon>
				<DockSeparator />
				<DockIcon>
					<svg class="size-full" viewBox="0 0 24 24" fill="currentColor">
						<path d="M22.288 21h-20.576c-.945 0-1.712-.767-1.712-1.712v-13.576c0-.945.767-1.712 1.712-1.712h20.576c.945 0 1.712.767 1.712 1.712v13.576c0 .945-.767 1.712-1.712 1.712zm-10.288-6.086l-9.342-6.483-.02 11.569h18.684v-11.569l-9.322 6.483zm8.869-9.914h-17.789l8.92 6.229 8.869-6.229z"/>
					</svg>
				</DockIcon>
				<DockIcon>
					<svg class="size-full" viewBox="0 0 24 24" fill="currentColor">
						<path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
					</svg>
				</DockIcon>
				<DockIcon>
					<svg class="size-full" viewBox="0 0 24 24" fill="currentColor">
						<path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
					</svg>
				</DockIcon>
			</Dock>
		</div>
	</section>

	<!-- With Separator -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">With Multiple Separators</h2>
		<div class="rounded-lg border bg-card p-6 flex justify-center">
			<Dock>
				<DockIcon>
					<svg class="size-full text-blue-500" viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
					</svg>
				</DockIcon>
				<DockSeparator />
				<DockIcon>
					<svg class="size-full text-green-500" viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
					</svg>
				</DockIcon>
				<DockIcon>
					<svg class="size-full text-yellow-500" viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
					</svg>
				</DockIcon>
				<DockSeparator />
				<DockIcon>
					<svg class="size-full text-red-500" viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
					</svg>
				</DockIcon>
			</Dock>
		</div>
	</section>

	<!-- Direction Variations -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Direction</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Control alignment with <code class="rounded bg-muted px-1.5 py-0.5">direction</code>: top, middle (default), or bottom.
		</p>
		<div class="rounded-lg border bg-card p-6 space-y-6">
			<div>
				<p class="text-sm text-muted-foreground mb-2 text-center">direction="top"</p>
				<div class="flex justify-center">
					<Dock direction="top" class="h-[80px]">
						<DockIcon>
							<div class="size-full rounded-full bg-gradient-to-br from-pink-500 to-purple-500"></div>
						</DockIcon>
						<DockIcon>
							<div class="size-full rounded-full bg-gradient-to-br from-blue-500 to-cyan-500"></div>
						</DockIcon>
						<DockIcon>
							<div class="size-full rounded-full bg-gradient-to-br from-green-500 to-emerald-500"></div>
						</DockIcon>
					</Dock>
				</div>
			</div>
			<div>
				<p class="text-sm text-muted-foreground mb-2 text-center">direction="middle" (default)</p>
				<div class="flex justify-center">
					<Dock direction="middle" class="h-[80px]">
						<DockIcon>
							<div class="size-full rounded-full bg-gradient-to-br from-pink-500 to-purple-500"></div>
						</DockIcon>
						<DockIcon>
							<div class="size-full rounded-full bg-gradient-to-br from-blue-500 to-cyan-500"></div>
						</DockIcon>
						<DockIcon>
							<div class="size-full rounded-full bg-gradient-to-br from-green-500 to-emerald-500"></div>
						</DockIcon>
					</Dock>
				</div>
			</div>
			<div>
				<p class="text-sm text-muted-foreground mb-2 text-center">direction="bottom"</p>
				<div class="flex justify-center">
					<Dock direction="bottom" class="h-[80px]">
						<DockIcon>
							<div class="size-full rounded-full bg-gradient-to-br from-pink-500 to-purple-500"></div>
						</DockIcon>
						<DockIcon>
							<div class="size-full rounded-full bg-gradient-to-br from-blue-500 to-cyan-500"></div>
						</DockIcon>
						<DockIcon>
							<div class="size-full rounded-full bg-gradient-to-br from-green-500 to-emerald-500"></div>
						</DockIcon>
					</Dock>
				</div>
			</div>
		</div>
	</section>

	<!-- Vertical Orientation -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Vertical Orientation</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Set <code class="rounded bg-muted px-1.5 py-0.5">orientation="vertical"</code> for a vertical dock.
		</p>
		<div class="rounded-lg border bg-card p-6 flex justify-center">
			<Dock orientation="vertical">
				<DockIcon>
					<svg class="size-full" viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
					</svg>
				</DockIcon>
				<DockSeparator />
				<DockIcon>
					<svg class="size-full" viewBox="0 0 24 24" fill="currentColor">
						<path d="M22.288 21h-20.576c-.945 0-1.712-.767-1.712-1.712v-13.576c0-.945.767-1.712 1.712-1.712h20.576c.945 0 1.712.767 1.712 1.712v13.576c0 .945-.767 1.712-1.712 1.712zm-10.288-6.086l-9.342-6.483-.02 11.569h18.684v-11.569l-9.322 6.483zm8.869-9.914h-17.789l8.92 6.229 8.869-6.229z"/>
					</svg>
				</DockIcon>
				<DockIcon>
					<svg class="size-full" viewBox="0 0 24 24" fill="currentColor">
						<path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
					</svg>
				</DockIcon>
				<DockIcon>
					<svg class="size-full" viewBox="0 0 24 24" fill="currentColor">
						<path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
					</svg>
				</DockIcon>
			</Dock>
		</div>
	</section>

	<!-- Magnification & Distance -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Magnification & Distance</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Adjust <code class="rounded bg-muted px-1.5 py-0.5">magnification</code> (max size increase) and
			<code class="rounded bg-muted px-1.5 py-0.5">distance</code> (hover range).
		</p>
		<div class="rounded-lg border bg-card p-6 space-y-6">
			<div>
				<p class="text-sm text-muted-foreground mb-2 text-center">magnification=100 (large)</p>
				<div class="flex justify-center">
					<Dock magnification={100}>
						<DockIcon>
							<div class="size-full rounded-full bg-gradient-to-br from-orange-500 to-red-500"></div>
						</DockIcon>
						<DockIcon>
							<div class="size-full rounded-full bg-gradient-to-br from-yellow-500 to-orange-500"></div>
						</DockIcon>
						<DockIcon>
							<div class="size-full rounded-full bg-gradient-to-br from-lime-500 to-green-500"></div>
						</DockIcon>
					</Dock>
				</div>
			</div>
			<div>
				<p class="text-sm text-muted-foreground mb-2 text-center">distance=80 (tight hover range)</p>
				<div class="flex justify-center">
					<Dock distance={80}>
						<DockIcon>
							<div class="size-full rounded-full bg-gradient-to-br from-violet-500 to-purple-500"></div>
						</DockIcon>
						<DockIcon>
							<div class="size-full rounded-full bg-gradient-to-br from-indigo-500 to-blue-500"></div>
						</DockIcon>
						<DockIcon>
							<div class="size-full rounded-full bg-gradient-to-br from-sky-500 to-cyan-500"></div>
						</DockIcon>
					</Dock>
				</div>
			</div>
		</div>
	</section>
</div>
