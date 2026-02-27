<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { validateContactForm, hasValidationErrors, sanitizeFormData } from "./validation.js";
	import type { ContactFormData, FieldErrors } from "./types.js";

	let formState = $state<ContactFormData>({ name: "", email: "", message: "" });
	let fieldErrors = $state<FieldErrors>({});
	let isSubmitting = $state(false);
	let success = $state(false);
	let globalError = $state("");

	// Textarea gradient mouse tracking
	let textareaContainerRef: HTMLDivElement | undefined = $state();
	let textareaMouse = $state({ x: 0, y: 0 });
	let textareaVisible = $state(false);
	const textareaRadius = 100;

	let textareaBg = $derived(
		`radial-gradient(${textareaVisible ? textareaRadius + "px" : "0px"} circle at ${textareaMouse.x}px ${textareaMouse.y}px, var(--color-blue-500, #3b82f6), transparent 80%)`
	);

	function handleTextareaMouseMove(e: MouseEvent) {
		if (!textareaContainerRef) return;
		const { left, top } = textareaContainerRef.getBoundingClientRect();
		textareaMouse = { x: e.clientX - left, y: e.clientY - top };
	}

	function dismissSuccess() {
		success = false;
	}

	function dismissError() {
		globalError = "";
	}

	function handleSubmit(e: Event) {
		e.preventDefault();
		fieldErrors = validateContactForm(formState);

		if (hasValidationErrors(fieldErrors)) return;

		isSubmitting = true;
		const sanitized = sanitizeFormData(formState);

		// Frontend-only: open mailto
		const subject = encodeURIComponent(`Portfolio Contact from ${sanitized.name}`);
		const body = encodeURIComponent(
			`Name: ${sanitized.name}\nEmail: ${sanitized.email}\n\nMessage:\n${sanitized.message}`
		);
		window.location.href = `mailto:rama.herbin@gmail.com?subject=${subject}&body=${body}`;

		setTimeout(() => {
			isSubmitting = false;
		}, 500);
		success = true;
		formState = { name: "", email: "", message: "" };

		setTimeout(() => {
			success = false;
		}, 5000);
	}
</script>

<div class="mx-auto w-full max-w-md">
	<!-- Global Success/Error Messages -->
	{#if success}
		<div class="mb-6">
			<div
				class="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20"
			>
				<div class="flex items-center">
					<svg
						class="mr-3 h-5 w-5 text-green-600 dark:text-green-400"
						fill="currentColor"
						viewBox="0 0 20 20"
					>
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
							clip-rule="evenodd"
						/>
					</svg>
					<p class="text-sm font-medium text-green-800 dark:text-green-200">
						Message sent successfully! I'll get back to you soon.
					</p>
				</div>
				<button
					onclick={dismissSuccess}
					class="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
					aria-label="Dismiss success message"
				>
					<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
							clip-rule="evenodd"
						/>
					</svg>
				</button>
			</div>
		</div>
	{/if}

	{#if globalError}
		<div class="mb-6">
			<div
				class="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20"
			>
				<div class="flex items-center">
					<svg
						class="mr-3 h-5 w-5 text-red-600 dark:text-red-400"
						fill="currentColor"
						viewBox="0 0 20 20"
					>
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
							clip-rule="evenodd"
						/>
					</svg>
					<p class="text-sm font-medium text-red-800 dark:text-red-200">{globalError}</p>
				</div>
				<button
					onclick={dismissError}
					class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
					aria-label="Dismiss error message"
				>
					<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
							clip-rule="evenodd"
						/>
					</svg>
				</button>
			</div>
		</div>
	{/if}

	<!-- Contact Form -->
	<form onsubmit={handleSubmit} class="space-y-6">
		<!-- Name Field -->
		<div>
			<label for="name" class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
				Name *
			</label>
			<input
				id="name"
				type="text"
				bind:value={formState.name}
				placeholder="Your full name"
				disabled={isSubmitting}
				class={cn(
					"shadow-input dark:placeholder-text-neutral-600 flex w-full rounded-md border-none bg-gray-50 px-3 py-2 text-sm text-black transition duration-400 placeholder:text-neutral-400 focus-visible:ring-[2px] focus-visible:ring-neutral-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800 dark:text-white dark:shadow-[0px_0px_1px_1px_var(--neutral-700)] dark:focus-visible:ring-neutral-600",
					fieldErrors.name ? "border-red-500 focus-visible:ring-red-500" : ""
				)}
				aria-describedby="name-error"
				required
			/>
			{#if fieldErrors.name}
				<p id="name-error" class="mt-1 text-sm text-red-600 dark:text-red-400">
					{fieldErrors.name}
				</p>
			{/if}
		</div>

		<!-- Email Field -->
		<div>
			<label for="email" class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
				Email *
			</label>
			<input
				id="email"
				type="email"
				bind:value={formState.email}
				placeholder="your.email@example.com"
				disabled={isSubmitting}
				class={cn(
					"shadow-input dark:placeholder-text-neutral-600 flex w-full rounded-md border-none bg-gray-50 px-3 py-2 text-sm text-black transition duration-400 placeholder:text-neutral-400 focus-visible:ring-[2px] focus-visible:ring-neutral-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800 dark:text-white dark:shadow-[0px_0px_1px_1px_var(--neutral-700)] dark:focus-visible:ring-neutral-600",
					fieldErrors.email ? "border-red-500 focus-visible:ring-red-500" : ""
				)}
				aria-describedby="email-error"
				required
			/>
			{#if fieldErrors.email}
				<p id="email-error" class="mt-1 text-sm text-red-600 dark:text-red-400">
					{fieldErrors.email}
				</p>
			{/if}
		</div>

		<!-- Message Field -->
		<div>
			<label for="message" class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
				Message *
			</label>
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				bind:this={textareaContainerRef}
				class="group/input rounded-lg p-[2px] transition duration-300"
				style:background={textareaBg}
				onmouseenter={() => (textareaVisible = true)}
				onmouseleave={() => (textareaVisible = false)}
				onmousemove={handleTextareaMouseMove}
			>
				<textarea
					id="message"
					bind:value={formState.message}
					rows="4"
					placeholder="Tell me about your project or just say hello..."
					disabled={isSubmitting}
					class={cn(
						"shadow-input dark:placeholder-text-neutral-600 flex w-full resize-none rounded-md border-none bg-gray-50 px-3 py-2 text-sm text-black transition duration-400 group-hover/input:shadow-none placeholder:text-neutral-400 focus-visible:ring-[2px] focus-visible:ring-neutral-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800 dark:text-white dark:shadow-[0px_0px_1px_1px_var(--neutral-700)] dark:focus-visible:ring-neutral-600",
						fieldErrors.message ? "border-red-500 focus-visible:ring-red-500" : ""
					)}
					aria-describedby="message-error"
					required
				></textarea>
			</div>
			{#if fieldErrors.message}
				<p id="message-error" class="mt-1 text-sm text-red-600 dark:text-red-400">
					{fieldErrors.message}
				</p>
			{/if}
		</div>

		<!-- Submit Button -->
		<button
			type="submit"
			disabled={isSubmitting}
			class="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors duration-200 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:bg-blue-400 dark:focus:ring-offset-gray-900"
			aria-label={isSubmitting ? "Sending message..." : "Send message"}
		>
			{#if isSubmitting}
				<svg
					class="mr-3 -ml-1 h-5 w-5 animate-spin text-white"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
			{/if}
			{isSubmitting ? "Sending..." : "Send Message"}
		</button>
	</form>
</div>
