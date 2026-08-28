<script lang="ts">
	import { TextRoll } from "$lib/fancy-ui/text-roll";
	import { Switch } from "$lib/fancy-ui/switch";

	let yearly = $state(false);
	// Same digit count either way ("$50" / "$40") on purpose — it's what makes
	// the roll visible as "only the changed digit moves": the "$" cell and the
	// trailing "0" cell keep their DOM node (same key, same grapheme), only
	// the middle digit's cell actually rolls.
	let price = $derived(yearly ? "$40" : "$50");
</script>

<div class="flex w-full flex-col items-center gap-6 p-6">
	<div
		class="bg-card border-border flex w-full max-w-xs flex-col items-center gap-1 rounded-xl border p-6"
	>
		<p class="text-muted-foreground text-sm">Pro plan</p>
		<p class="text-foreground flex items-baseline gap-1 text-4xl font-semibold">
			<!-- tabular: locks digit advance width so the two internal layers never
			     drift apart. live="polite": a final price after a toggle is exactly
			     the kind of change worth announcing (unlike a per-second ticker). -->
			<TextRoll value={price} tabular live="polite" />
			<span class="text-muted-foreground text-base font-normal">/mo</span>
		</p>
		<p class="text-muted-foreground text-xs">
			{yearly ? "Billed annually" : "Billed monthly"}
		</p>
	</div>

	<Switch bind:checked={yearly}>Bill yearly, save 20%</Switch>
</div>
