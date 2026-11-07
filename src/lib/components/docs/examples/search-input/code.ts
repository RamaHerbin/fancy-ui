import { attribute, type PlaygroundScalar } from "$lib/docs/playground-code.js";
import type { Framework } from "$lib/inspiration/types.js";

/**
 * The usage per framework: the query is bound state. The placeholder default
 * is "Search" and the clear button is on by default, so each is written only
 * when it differs. The label has no default and is always written.
 */
export function searchInputCode(
	values: Record<string, PlaygroundScalar>,
	framework: Framework
): string {
	const attrs: string[] = [];
	if (values.placeholder && values.placeholder !== "Search")
		attrs.push(attribute("placeholder", String(values.placeholder), framework));
	if (values.label) attrs.push(attribute("label", String(values.label), framework));
	if (typeof values.debounceMs === "number" && values.debounceMs !== 0)
		attrs.push(attribute("debounceMs", values.debounceMs, framework));
	if (values.clearable === false) attrs.push(attribute("clearable", false, framework));
	for (const flag of ["disabled", "readonly", "required", "invalid", "sound"])
		if (values[flag] === true) attrs.push(flag);

	const lines = (...first: string[]) => [...first, ...attrs].map((a) => `\n\t${a}`).join("");

	if (framework === "vue") {
		return `<script setup lang="ts">
import { ref } from "vue";

const query = ref("");
</script>

<SearchInput${lines('v-model:value="query"')}
/>`;
	}
	if (framework === "react") {
		return `const [query, setQuery] = useState("");

<SearchInput${lines(`value={query}`, `onValueChange={setQuery}`)}
/>`;
	}
	return `<script lang="ts">
let query = $state("");
</script>

<SearchInput${lines(`bind:value={query}`)}
/>`;
}
