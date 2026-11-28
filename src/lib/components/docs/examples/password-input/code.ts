import { attribute, type PlaygroundScalar } from "$lib/docs/playground-code.js";
import type { Framework } from "$lib/inspiration/types.js";

/**
 * The usage per framework: the password is bound state, seeded with the
 * sample the preview shows so the strength meter has something to read. The
 * toggle is on and the meter off by default, so each is written only when it
 * differs. The label and placeholder have no default and are always written.
 */
export function passwordInputCode(
	values: Record<string, PlaygroundScalar>,
	framework: Framework
): string {
	const attrs: string[] = [];
	if (values.label) attrs.push(attribute("label", String(values.label), framework));
	if (values.placeholder)
		attrs.push(attribute("placeholder", String(values.placeholder), framework));
	if (values.autocomplete && values.autocomplete !== "current-password")
		attrs.push(attribute("autocomplete", String(values.autocomplete), framework));
	if (values.showToggle === false) attrs.push(attribute("showToggle", false, framework));
	if (values.showStrength === true) attrs.push("showStrength");
	for (const flag of ["disabled", "readonly", "required", "invalid", "sound"])
		if (values[flag] === true) attrs.push(flag);

	const lines = (...first: string[]) => [...first, ...attrs].map((a) => `\n\t${a}`).join("");

	if (framework === "vue") {
		return `<script setup lang="ts">
import { ref } from "vue";

const password = ref("correct horse 7!");
</script>

<PasswordInput${lines('v-model:value="password"')}
/>`;
	}
	if (framework === "react") {
		return `const [password, setPassword] = useState("correct horse 7!");

<PasswordInput${lines(`value={password}`, `onValueChange={setPassword}`)}
/>`;
	}
	return `<script lang="ts">
let password = $state("correct horse 7!");
</script>

<PasswordInput${lines(`bind:value={password}`)}
/>`;
}
