<script lang="ts">
	import { FormField } from "$lib/fancy-ui/form-field";
</script>

<!--
  A context-aware control (Input and friends, elsewhere in this library)
  reads its id and aria-describedby off FormField's context automatically.
  This plain <input> stands in for one and mirrors that wiring by hand —
  see the FormField README for the full, no-manual-wiring picture.
-->
<FormField id="signup-email" label="Email" description="We'll only use this to send your receipt.">
	{#snippet children()}
		<input
			id="signup-email"
			type="email"
			placeholder="you@example.com"
			aria-describedby="signup-email-description"
			class="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring/50 focus-visible:border-ring w-full rounded-lg border px-3 py-[9px] text-[13px] outline-none focus-visible:ring-2"
		/>
	{/snippet}
</FormField>
