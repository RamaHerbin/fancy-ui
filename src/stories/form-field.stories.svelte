<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { FormField } from "$lib/fancy-ui/form-field";

	const { Story } = defineMeta({
		title: "Forms/FormField",
		component: FormField,
		tags: ["autodocs"],
		args: {
			label: "Email",
			description: "We'll only use this to send your receipt.",
			required: false,
			disabled: false,
		},
		argTypes: {
			label: { control: "text", description: "Label text — the common case" },
			description: { control: "text", description: "Help text, replaced by error while invalid" },
			error: { control: "text", description: "Error text; setting it marks the field invalid" },
			valid: {
				control: "boolean",
				description: "Decorative checkmark next to the help text; error wins if both are set",
			},
			required: {
				control: "boolean",
				description: "Asterisk on the label, aria-required on the control",
			},
			disabled: { control: "boolean", description: "Reaches the control through context" },
		},
	});

	const inputClasses =
		"border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring/50 focus-visible:border-ring aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/25 w-full rounded-lg border px-3 py-[9px] text-[13px] outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50";
</script>

{#snippet template(args: any)}
	<div class="w-72">
		<FormField {...args} id="story-field">
			{#snippet children()}
				<input
					id="story-field"
					type="text"
					placeholder="you@example.com"
					disabled={args.disabled}
					aria-invalid={args.error ? "true" : undefined}
					aria-describedby={args.error ? "story-field-error" : "story-field-description"}
					class={inputClasses}
				/>
			{/snippet}
		</FormField>
	</div>
{/snippet}

{#snippet validatedTemplate()}
	<div class="w-72">
		<FormField
			id="story-valid"
			label="Email"
			description="Used for sign-in and notifications."
			valid
		>
			{#snippet children()}
				<div class="relative">
					<input
						id="story-valid"
						type="email"
						value="rama@fancy.ui"
						aria-describedby="story-valid-description"
						class="bg-background w-full rounded-lg border border-emerald-500/45 px-3 py-[9px] pr-8 text-[13px] outline-none"
					/>
					<span
						class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-emerald-500"
					>
						✓<span class="sr-only"> (valid)</span>
					</span>
				</div>
			{/snippet}
		</FormField>
	</div>
{/snippet}

<Story name="Default" {template} />

<Story
	name="With error"
	{template}
	args={{
		label: "Username",
		required: true,
		description: undefined,
		error: "Minimum 3 characters.",
	}}
/>

<Story name="Validated" template={validatedTemplate} />

<Story name="Disabled" {template} args={{ disabled: true }} />

<Story name="Required" {template} args={{ required: true }} />
