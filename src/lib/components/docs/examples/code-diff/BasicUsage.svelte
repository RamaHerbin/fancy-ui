<script lang="ts">
	import { CodeDiff } from "$lib/fancy-ui/code-diff";

	/** A two-hunk edit to one file: the shape an agent hands back after a fix. */
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

	/** A move with an edit inside it, so the header has something to say. */
	const RENAME = [
		"diff --git a/src/lib/query.ts b/src/lib/db/totals.ts",
		"similarity index 94%",
		"rename from src/lib/query.ts",
		"rename to src/lib/db/totals.ts",
		"--- a/src/lib/query.ts",
		"+++ b/src/lib/db/totals.ts",
		"@@ -1,3 +1,3 @@",
		'-import { compile } from "./ast";',
		'+import { compile } from "../ast";',
		" ",
		' const UNASSIGNED = "Unassigned";',
		"",
	].join("\n");
</script>

<div class="flex w-full max-w-2xl flex-col gap-4">
	<CodeDiff sound diff={PATCH} />
	<CodeDiff sound diff={RENAME} />
</div>
