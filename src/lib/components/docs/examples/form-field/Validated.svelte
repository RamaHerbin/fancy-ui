<script lang="ts">
	import { FormField } from "$lib/fancy-ui/form-field";
</script>

<!--
  `valid` puts a decorative checkmark next to the help text (aria-hidden —
  the description text itself is what actually says the value is fine) and
  publishes `valid` on the field context. A context-aware control can read
  that to draw its own success look; this plain <input> isn't one, so it
  mirrors the same treatment by hand, the same way it already mirrors the
  id and aria-describedby. Its own checkmark also gets an sr-only "(valid)",
  since a control-level glyph doesn't inherit FormField's own aria-hidden
  reasoning for free.
-->
<FormField
	id="signup-email-2"
	label="Email"
	description="Used for sign-in and notifications."
	valid
>
	{#snippet children()}
		<div class="relative">
			<input
				id="signup-email-2"
				type="email"
				value="rama@fancy.ui"
				aria-describedby="signup-email-2-description"
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
