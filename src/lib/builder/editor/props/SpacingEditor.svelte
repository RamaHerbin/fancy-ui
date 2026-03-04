<script lang="ts">
	import type { SpacingPropSchema } from "../../types/registry.js";
	import {
		parseSpacingClasses,
		buildSpacingClasses,
		SPACING_SCALE,
		type SpacingValues,
	} from "./spacing-utils.js";

	interface Props {
		value: string;
		schema: SpacingPropSchema;
		onchange: (value: string) => void;
	}

	let { value, schema, onchange }: Props = $props();

	let properties = $derived(schema.properties ?? ["padding"]);

	let paddingValues = $derived(parseSpacingClasses(value, "p"));
	let marginValues = $derived(parseSpacingClasses(value, "m"));

	function update(layer: "p" | "m", side: keyof SpacingValues, newVal: string) {
		let pv = { ...paddingValues };
		let mv = { ...marginValues };

		if (layer === "p") {
			pv = { ...pv, [side]: newVal };
		} else {
			mv = { ...mv, [side]: newVal };
		}

		const parts: string[] = [];
		if (properties.includes("margin")) {
			const mc = buildSpacingClasses(mv, "m");
			if (mc) parts.push(mc);
		}
		if (properties.includes("padding")) {
			const pc = buildSpacingClasses(pv, "p");
			if (pc) parts.push(pc);
		}
		onchange(parts.join(" "));
	}

	const scaleOptions = ["", ...SPACING_SCALE];

	function displayVal(v: string): string {
		return v || "-";
	}

	const sides: Array<{ key: keyof SpacingValues; label: string }> = [
		{ key: "top", label: "T" },
		{ key: "right", label: "R" },
		{ key: "bottom", label: "B" },
		{ key: "left", label: "L" },
	];
</script>

<div class="space-y-2">
	{#each properties as prop}
		{@const prefix = prop === "padding" ? "p" : "m"}
		{@const vals = prop === "padding" ? paddingValues : marginValues}
		<div class="relative">
			<span
				class="text-muted-foreground mb-1 block text-[10px] font-medium tracking-wide uppercase"
			>
				{prop}
			</span>
			<!-- Box model visualization -->
			<div
				class="border-border bg-muted/30 relative flex items-center justify-center rounded border"
				style="min-height: 80px;"
			>
				<!-- Top -->
				<div class="absolute top-0.5 left-1/2 -translate-x-1/2">
					<select
						class="text-foreground bg-transparent text-center font-mono text-[11px] focus:outline-none"
						value={vals.top}
						onchange={(e) => update(prefix, "top", e.currentTarget.value)}
					>
						{#each scaleOptions as s}
							<option value={s}>{s || "-"}</option>
						{/each}
					</select>
				</div>
				<!-- Bottom -->
				<div class="absolute bottom-0.5 left-1/2 -translate-x-1/2">
					<select
						class="text-foreground bg-transparent text-center font-mono text-[11px] focus:outline-none"
						value={vals.bottom}
						onchange={(e) => update(prefix, "bottom", e.currentTarget.value)}
					>
						{#each scaleOptions as s}
							<option value={s}>{s || "-"}</option>
						{/each}
					</select>
				</div>
				<!-- Left -->
				<div class="absolute top-1/2 left-1 -translate-y-1/2">
					<select
						class="text-foreground bg-transparent text-center font-mono text-[11px] focus:outline-none"
						value={vals.left}
						onchange={(e) => update(prefix, "left", e.currentTarget.value)}
					>
						{#each scaleOptions as s}
							<option value={s}>{s || "-"}</option>
						{/each}
					</select>
				</div>
				<!-- Right -->
				<div class="absolute top-1/2 right-1 -translate-y-1/2">
					<select
						class="text-foreground bg-transparent text-center font-mono text-[11px] focus:outline-none"
						value={vals.right}
						onchange={(e) => update(prefix, "right", e.currentTarget.value)}
					>
						{#each scaleOptions as s}
							<option value={s}>{s || "-"}</option>
						{/each}
					</select>
				</div>
				<!-- Center content label -->
				<div class="border-border/50 rounded border border-dashed px-3 py-2">
					<span class="text-muted-foreground text-[10px]">content</span>
				</div>
			</div>
		</div>
	{/each}
	<!-- Raw output for reference -->
	<p class="text-muted-foreground/60 truncate font-mono text-[10px]">
		{value || "(none)"}
	</p>
</div>
