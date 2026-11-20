import { attribute, type PlaygroundScalar } from "$lib/docs/playground-code.js";
import type { Framework } from "$lib/inspiration/types.js";

/** The patch the playground renders, written into the usage so the copy stands on its own. */
export const DATA = `const diff = \`diff --git a/src/lib/query.ts b/src/lib/query.ts
index 8f2a1c4..b31e097 100644
--- a/src/lib/query.ts
+++ b/src/lib/query.ts
@@ -12,6 +12,7 @@ export async function totalsByRegion(db: Db) {
   const sql = compile(ast);
-  const rows = await db.query(sql);
-  return rows;
+  const rows = await db.query(sql, { timeout: 5_000 });
+  if (rows.length === 0) return [];
+  return rows.map(normalise);
 }

 function normalise(row: Row) {
@@ -41,3 +42,3 @@ function normalise(row: Row) {
   const region = row.region ?? UNASSIGNED;
-  return { region, total: row.total };
+  return { region, total: Number(row.total) };
 }
\`;`;

/**
 * The usage per framework: a diff view is nothing without its patch, which
 * lives outside the playground's controls, so the export carries the patch
 * definition and passes the required `diff` prop.
 */
export function codeDiffCode(
	values: Record<string, PlaygroundScalar>,
	framework: Framework
): string {
	const attrs: string[] = [];
	if (values.filename) attrs.push(attribute("filename", String(values.filename), framework));
	if (values.lineNumbers === false) attrs.push(attribute("lineNumbers", false, framework));
	if (values.collapsed === true) attrs.push("collapsed");
	if (typeof values.maxLines === "number" && values.maxLines > 0)
		attrs.push(attribute("maxLines", values.maxLines, framework));
	if (values.wrap === true) attrs.push("wrap");
	if (values.sound === true) attrs.push("sound");
	const props = attrs.map((a) => `\n\t${a}`).join("");
	if (framework === "vue") {
		return `<script setup lang="ts">
${DATA}
</script>

<CodeDiff :diff="diff"${props} />`;
	}
	if (framework === "react") {
		return `${DATA}

<CodeDiff diff={diff}${props} />`;
	}
	return `<script lang="ts">
${DATA}
</script>

<CodeDiff {diff}${props} />`;
}
