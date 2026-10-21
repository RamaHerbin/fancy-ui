/**
 * React and Vue names for a Svelte prop, snippet or event, derived by the
 * rules both packages document instead of a hand-kept table:
 *
 * - `class` is `className` in React; Vue keeps `class`.
 * - Lowercase callbacks are camel-cased: `onclick` → `onClick`,
 *   `onpercentagechange` → `onPercentageChange`. Callbacks that are already
 *   camel-cased (`onValueChange`) keep their name.
 * - A snippet prop is a `ReactNode` prop of the same name in React and a named
 *   slot in Vue (`children` is the default slot).
 * - A prop the Vue port declares with `defineModel` is `v-model:<name>` in Vue;
 *   React keeps the name. The list of models comes from the Vue sources, not
 *   from the word "bindable" in a description: some Svelte bindables are plain
 *   props in Vue. `ref` is never a model: Vue exposes the element on a template
 *   ref (`defineExpose({ ref })`), so its name stays `ref`.
 *
 * Splitting a lowercase callback into words needs a vocabulary; a name made of
 * words outside it returns null, and the page keeps pointing to the written
 * list of differences rather than guessing.
 */

export type PortFramework = "react" | "vue";

export interface PortableProp {
	name: string;
	type: string;
	description?: string;
}

/**
 * Words that lowercase callback names are made of, longest match wins. DOM
 * events whose React name is not their camel-cased spelling (`dblclick` is
 * `onDoubleClick`) are left out on purpose, so they read as unknown.
 */
const WORDS = [
	"animation",
	"before",
	"blur",
	"cancel",
	"change",
	"click",
	"close",
	"complete",
	"context",
	"covered",
	"delete",
	"down",
	"drag",
	"drop",
	"end",
	"enter",
	"error",
	"expand",
	"fade",
	"flip",
	"focus",
	"hover",
	"in",
	"input",
	"iteration",
	"key",
	"leave",
	"load",
	"lost",
	"menu",
	"mouse",
	"move",
	"open",
	"out",
	"over",
	"percentage",
	"phase",
	"pointer",
	"press",
	"query",
	"ready",
	"reset",
	"resize",
	"revealed",
	"reveal",
	"scroll",
	"select",
	"start",
	"step",
	"stop",
	"submit",
	"toggle",
	"touch",
	"transition",
	"up",
	"value",
	"wheel",
];

const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

/** Split a lowercase run into known words, or null when some part is unknown. */
function splitWords(text: string): string[] | null {
	// Dynamic programming over prefixes: best[i] is a split of text[0, i).
	const best: (string[] | null)[] = [[]];
	for (let end = 1; end <= text.length; end++) {
		best[end] = null;
		for (let start = 0; start < end; start++) {
			const head = best[start];
			const word = text.slice(start, end);
			if (head && WORDS.includes(word)) {
				const split = [...head, word];
				const current = best[end];
				if (!current || split.length < current.length) best[end] = split;
			}
		}
	}
	return best[text.length] ?? null;
}

/** `click` / `onclick` / `valueChange` → `onClick` / `onClick` / `onValueChange`. */
function callbackName(name: string): string | null {
	const bare = /^on(?=[a-z])/.test(name) && splitWords(name.slice(2)) ? name.slice(2) : name;
	if (/^on[A-Z]/.test(bare)) return bare;
	if (/[A-Z]/.test(bare)) return `on${capitalize(bare)}`;
	const words = splitWords(bare);
	return words ? `on${words.map(capitalize).join("")}` : null;
}

function isCallback(prop: PortableProp): boolean {
	return /^on[a-zA-Z]/.test(prop.name) && prop.type.includes("=>");
}

function isSnippet(type: string): boolean {
	return /^Snippet\b/.test(type.trim());
}

/** Apply `map` to the part after the last dot of `Sub.member`, keeping the prefix. */
function member(name: string, map: (bare: string) => string | null): string | null {
	const dot = name.lastIndexOf(".");
	if (dot === -1) return map(name);
	const mapped = map(name.slice(dot + 1));
	return mapped === null ? null : `${name.slice(0, dot + 1)}${mapped}`;
}

function slotName(bare: string, framework: PortFramework): string {
	if (framework === "react") return bare;
	return bare === "children" ? "#default" : `#${bare}`;
}

export interface PortOptions {
	/**
	 * Models the Vue port declares with `defineModel`, as registry prop names:
	 * bare for the main component, `Sub.name` for a sub-component.
	 */
	vueModels?: readonly string[];
}

/** The React or Vue name of a Svelte prop, or null when the rules cannot say. */
export function portPropName(
	prop: PortableProp,
	framework: PortFramework,
	options: PortOptions = {}
): string | null {
	return member(prop.name, (bare) => {
		if (isSnippet(prop.type)) return slotName(bare, framework);
		if (isCallback({ ...prop, name: bare })) return callbackName(bare);
		if (bare === "class") return framework === "react" ? "className" : "class";
		if (bare === "ref") return bare;
		if (framework === "vue" && options.vueModels?.includes(prop.name)) return `v-model:${bare}`;
		return bare;
	});
}

/** The React prop or Vue slot that carries a Svelte snippet. */
export function portSlotName(name: string, framework: PortFramework): string {
	return member(name, (bare) => slotName(bare, framework)) ?? name;
}

/** The React or Vue callback prop for a Svelte event, or null when the rules cannot say. */
export function portEventName(name: string, _framework: PortFramework): string | null {
	return member(name, callbackName);
}
