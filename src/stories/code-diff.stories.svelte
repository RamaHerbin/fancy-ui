<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { CodeDiff } from "$lib/fancy-ui/code-diff";

	const PATCH = [
		"diff --git a/src/lib/query.ts b/src/lib/query.ts",
		"index 8f2a1c4..b31e097 100644",
		"--- a/src/lib/query.ts",
		"+++ b/src/lib/query.ts",
		"@@ -12,6 +12,7 @@ export async function totalsByRegion(db: Db) {",
		"   const sql = compile(ast);",
		"-  const rows = await db.query(sql);",
		"-  return rows;",
		"+  const rows = await db.query(sql, { timeout: 5_000 });",
		"+  if (rows.length === 0) return [];",
		"+  return rows.map(normalise);",
		" }",
		" ",
		" function normalise(row: Row) {",
		"@@ -41,3 +42,3 @@ function normalise(row: Row) {",
		"   const region = row.region ?? UNASSIGNED;",
		"-  return { region, total: row.total };",
		"+  return { region, total: Number(row.total) };",
		" }",
		"",
	].join("\n");

	const { Story } = defineMeta({
		title: "AI Agents/CodeDiff",
		component: CodeDiff,
		tags: ["autodocs"],
		args: {
			diff: PATCH,
			lineNumbers: true,
			collapsed: false,
			maxLines: 0,
			wrap: false,
		},
		argTypes: {
			diff: { control: "text", description: "Raw unified diff text" },
			filename: {
				control: "text",
				description: "Header label when the patch names no file, or names just one",
			},
			lineNumbers: {
				control: "boolean",
				description: "Whether to show the old/new line-number gutters",
			},
			collapsed: {
				control: "boolean",
				description: "Whether the bodies are folded away; a click folds one file",
			},
			maxLines: {
				control: "number",
				description: "Lines shown before the rest hide behind a button; 0 shows all",
			},
			wrap: {
				control: "boolean",
				description: "Whether long lines wrap instead of scrolling sideways",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div class="w-full max-w-2xl p-6">
		<CodeDiff {...args} />
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Collapsed" {template} args={{ collapsed: true }} />

<Story name="No Line Numbers" {template} args={{ lineNumbers: false }} />

<Story name="Clamped" {template} args={{ maxLines: 4 }} />
