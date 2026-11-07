<script lang="ts">
	import { CodeDiff } from "$lib/fancy-ui/code-diff";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";

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
</script>

<PropsPlayground
	component="CodeDiff"
	slug="code-diff"
	required={["diff"]}
	controls={[
		{ key: "filename", type: "text", label: "Filename", maxLength: 60 },
		{ key: "lineNumbers", type: "boolean", label: "Line numbers" },
		{ key: "collapsed", type: "boolean", label: "Collapsed" },
		{ key: "maxLines", type: "range", label: "Max lines (0 = all)", min: 0, max: 20, step: 1 },
		{ key: "wrap", type: "boolean", label: "Wrap long lines" },
		{ key: "sound", type: "boolean", label: "Sound" },
	]}
	initialValues={{
		filename: "src/lib/query.ts",
		lineNumbers: true,
		collapsed: false,
		maxLines: 0,
		wrap: false,
		sound: false,
	}}
>
	{#snippet preview(values)}
		<div class="w-[36rem] max-w-[85vw]">
			<CodeDiff
				diff={PATCH}
				filename={values.filename as string}
				lineNumbers={values.lineNumbers as boolean}
				collapsed={values.collapsed as boolean}
				maxLines={values.maxLines as number}
				wrap={values.wrap as boolean}
				sound={values.sound as boolean}
			/>
		</div>
	{/snippet}
</PropsPlayground>
