<script lang="ts">
	import { getEditorState } from "../stores/editor.svelte.js";
	import type { PropSchema, LinkValue } from "../types/registry.js";
	import type { BlockNode } from "../types/page.js";
	import StringEditor from "./props/StringEditor.svelte";
	import NumberEditor from "./props/NumberEditor.svelte";
	import BooleanEditor from "./props/BooleanEditor.svelte";
	import ColorEditor from "./props/ColorEditor.svelte";
	import SelectEditor from "./props/SelectEditor.svelte";
	import LinkEditor from "./props/LinkEditor.svelte";
	import IconEditor from "./props/IconEditor.svelte";
	import SpacingEditor from "./props/SpacingEditor.svelte";
	import ClassEditor from "./props/ClassEditor.svelte";

	const editor = getEditorState();

	function handlePropChange(key: string, value: unknown) {
		if (!editor.selectedBlockId) return;
		editor.updateBlockProp(editor.selectedBlockId, key, value);
	}

	const defaultLink: LinkValue = { href: "#", target: "_self" };

	function asLink(val: unknown, fallback: unknown): LinkValue {
		const v = val ?? fallback ?? defaultLink;
		if (v && typeof v === "object" && "href" in v) return v as LinkValue;
		return defaultLink;
	}

	// --- Grouping logic ---

	interface PropGroup {
		name: string;
		defaultOpen: boolean;
		entries: [string, PropSchema][];
	}

	function isPropVisible(schema: PropSchema, block: BlockNode): boolean {
		if (!schema.showWhen) return true;
		return block.props[schema.showWhen.prop] === schema.showWhen.equals;
	}

	function buildGroups(schemas: Record<string, PropSchema>): PropGroup[] {
		const groupMap = new Map<string, [string, PropSchema][]>();

		for (const [key, schema] of Object.entries(schemas)) {
			let groupName: string;
			if (schema.advanced) {
				groupName = "Advanced";
			} else if (schema.group) {
				groupName = schema.group;
			} else {
				groupName = "General";
			}

			if (!groupMap.has(groupName)) {
				groupMap.set(groupName, []);
			}
			groupMap.get(groupName)!.push([key, schema]);
		}

		// Build ordered array: General first, named groups alphabetically, Advanced last
		const groups: PropGroup[] = [];

		if (groupMap.has("General")) {
			groups.push({
				name: "General",
				defaultOpen: true,
				entries: groupMap.get("General")!,
			});
			groupMap.delete("General");
		}

		const advancedEntries = groupMap.get("Advanced");
		groupMap.delete("Advanced");

		// Named groups alphabetically
		const namedKeys = [...groupMap.keys()].sort();
		for (const name of namedKeys) {
			groups.push({
				name,
				defaultOpen: true,
				entries: groupMap.get(name)!,
			});
		}

		if (advancedEntries) {
			groups.push({
				name: "Advanced",
				defaultOpen: false,
				entries: advancedEntries,
			});
		}

		return groups;
	}
</script>

<div class="flex min-h-0 flex-1 flex-col">
	{#if editor.selectedBlock && editor.selectedMeta}
		{@const block = editor.selectedBlock}
		{@const meta = editor.selectedMeta}
		{@const groups = buildGroups(meta.propSchemas)}
		{@const isSingleGroup = groups.length === 1}

		<div class="border-border shrink-0 border-b px-4 py-3">
			<h3 class="text-sm font-semibold">{meta.name}</h3>
			<p class="text-muted-foreground text-xs">{meta.slug}</p>
		</div>

		<div class="min-h-0 flex-1 overflow-y-auto">
			{#each groups as group (group.name)}
				{@const visibleEntries = group.entries.filter(([, s]) => isPropVisible(s, block))}
				{#if visibleEntries.length > 0}
					{#if isSingleGroup}
						<!-- Flat layout: no accordion chrome -->
						<div class="space-y-4 p-4">
							{#each visibleEntries as [key, schema] (key)}
								{@render propField(key, schema, block)}
							{/each}
						</div>
					{:else}
						<!-- Accordion group -->
						<details open={group.defaultOpen} class="border-border border-b">
							<summary
								class="hover:bg-muted/50 flex cursor-pointer items-center gap-2 px-4 py-2.5 select-none"
							>
								<svg
									class="text-muted-foreground h-3.5 w-3.5 shrink-0 transition-transform [[open]>&]:rotate-90"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<path d="m9 18 6-6-6-6" />
								</svg>
								<span class="text-xs font-medium">{group.name}</span>
								<span
									class="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px] leading-none"
								>
									{visibleEntries.length}
								</span>
							</summary>
							<div class="space-y-4 px-4 pb-4">
								{#each visibleEntries as [key, schema] (key)}
									{@render propField(key, schema, block)}
								{/each}
							</div>
						</details>
					{/if}
				{/if}
			{/each}
		</div>

		<div class="border-border shrink-0 border-t p-4">
			<button
				type="button"
				class="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full rounded-md px-3 py-2 text-sm font-medium"
				onclick={() => editor.removeBlock(block.id)}
			>
				Delete Block
			</button>
		</div>
	{:else}
		<div class="flex flex-1 items-center justify-center p-6 text-center">
			<p class="text-muted-foreground text-sm">Select a block to edit its properties</p>
		</div>
	{/if}
</div>

{#snippet propField(key: string, schema: PropSchema, block: BlockNode)}
	<div>
		<!-- svelte-ignore a11y_label_has_associated_control -->
		<label class="text-muted-foreground mb-1.5 block text-xs font-medium">
			{schema.label}
			{#if schema.description}
				<span class="text-muted-foreground/60 ml-1" title={schema.description}>?</span>
			{/if}
		</label>
		{#if schema.type === "string" || schema.type === "image"}
			<StringEditor
				value={String(block.props[key] ?? schema.default ?? "")}
				{schema}
				onchange={(v) => handlePropChange(key, v)}
			/>
		{:else if schema.type === "number"}
			<NumberEditor
				value={Number(block.props[key] ?? schema.default ?? 0)}
				{schema}
				onchange={(v) => handlePropChange(key, v)}
			/>
		{:else if schema.type === "boolean"}
			<BooleanEditor
				value={Boolean(block.props[key] ?? schema.default ?? false)}
				{schema}
				onchange={(v) => handlePropChange(key, v)}
			/>
		{:else if schema.type === "color"}
			<ColorEditor
				value={String(block.props[key] ?? schema.default ?? "#000000")}
				{schema}
				onchange={(v) => handlePropChange(key, v)}
			/>
		{:else if schema.type === "select"}
			<SelectEditor
				value={String(block.props[key] ?? schema.default ?? "")}
				{schema}
				onchange={(v) => handlePropChange(key, v)}
			/>
		{:else if schema.type === "json"}
			<textarea
				class="border-border bg-input text-foreground focus:ring-ring h-20 w-full resize-y rounded-md border px-3 py-2 font-mono text-xs focus:ring-2 focus:outline-none"
				value={JSON.stringify(block.props[key] ?? schema.default, null, 2)}
				oninput={(e) => {
					try {
						const parsed = JSON.parse(e.currentTarget.value);
						handlePropChange(key, parsed);
					} catch {
						// Invalid JSON, ignore
					}
				}}
			></textarea>
		{:else if schema.type === "link"}
			<LinkEditor
				value={asLink(block.props[key], schema.default)}
				{schema}
				onchange={(v) => handlePropChange(key, v)}
			/>
		{:else if schema.type === "icon"}
			<IconEditor
				value={String(block.props[key] ?? schema.default ?? "")}
				{schema}
				onchange={(v) => handlePropChange(key, v)}
			/>
		{:else if schema.type === "spacing"}
			<SpacingEditor
				value={String(block.props[key] ?? schema.default ?? "")}
				{schema}
				onchange={(v) => handlePropChange(key, v)}
			/>
		{:else if schema.type === "class"}
			<ClassEditor
				value={String(block.props[key] ?? schema.default ?? "")}
				{schema}
				onchange={(v) => handlePropChange(key, v)}
			/>
		{/if}
	</div>
{/snippet}
