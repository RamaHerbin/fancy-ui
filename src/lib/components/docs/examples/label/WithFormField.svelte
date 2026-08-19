<script lang="ts">
	import { Label } from "$lib/fancy-ui/label";
	import { FormField } from "$lib/fancy-ui/form-field";
</script>

<!--
  Inside a FormField, a hand-placed Label needs neither `for` nor `required`
  — it reads both straight off the field's own context. That is the escape
  hatch for label markup beyond FormField's own `label` string prop: skip
  that prop and render a Label yourself as part of `children`.

  A context-aware control (Input and friends, elsewhere in this library)
  reads its id and aria wiring off the same context automatically. This
  plain <input> cannot do that, so it mirrors the id FormField was given —
  see the FormField docs for the full, no-manual-wiring picture.
-->
<FormField id="display-name" required description="This is how your name appears to other members.">
	{#snippet children()}
		<Label>Display name</Label>
		<input
			id="display-name"
			type="text"
			placeholder="Ada Lovelace"
			aria-describedby="display-name-description"
			class="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring/50 focus-visible:border-ring mt-1.5 w-full rounded-lg border px-3 py-[9px] text-[13px] outline-none focus-visible:ring-2"
		/>
	{/snippet}
</FormField>
