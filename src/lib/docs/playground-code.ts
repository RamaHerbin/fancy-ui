/**
 * What the props playground prints: the usage code for the current control
 * values, and the export block an agent can paste into a prompt.
 *
 * The serializer writes only what differs from the initial values, so the
 * code stays as short as the change. Names follow the same rules as the API
 * tables (`port-names.ts`): `class` is `className` in React, a Vue model is
 * `v-model:<name>`, a callback is `onClick` in React and `@click` in Vue. The
 * Svelte spelling is the registry's own.
 */

import type { Framework } from "$lib/inspiration/types.js";
import { portEventName, portPropName, type PortOptions } from "./port-names.js";
import { INSTALL_SNIPPETS } from "./install-snippets.js";

export type PlaygroundScalar = string | number | boolean;

export const PACKAGE_BY_FRAMEWORK: Record<Framework, string> = {
	svelte: "fancy-ui-svelte",
	react: "fancy-ui-react",
	vue: "fancy-ui-vue",
};

const FRAMEWORK_LABEL: Record<Framework, string> = {
	svelte: "Svelte",
	react: "React",
	vue: "Vue",
};

export interface SerializeInput {
	framework: Framework;
	/** Name of the component as the package exports it. */
	component: string;
	values: Record<string, PlaygroundScalar>;
	initialValues: Record<string, PlaygroundScalar>;
	/** Text between the tags; without it the tag is self-closing. */
	children?: string;
	/** A value whose text is the children instead of an attribute (always written). */
	childrenKey?: string;
	/** Props written even when they equal the initial value (required props). */
	required?: string[];
	/** Callbacks always written (Svelte names, e.g. `onclick`) with the handler's identifier. */
	callbacks?: { name: string; handler: string }[];
	/** What the React and Vue ports declare, so names match their API tables. */
	ports?: PortOptions;
	/** A component whose usage is not a tag (a function call) writes its own code. */
	codeFor?: (values: Record<string, PlaygroundScalar>, framework: Framework) => string | null;
}

const MAX_LINE = 80;

function escapeText(text: string, framework: Framework): string {
	const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
	// Vue evaluates `{{ }}` in text; a literal pair is written as an expression.
	if (framework === "vue") return escaped.replace(/\{\{/g, "{{ '{{' }}");
	// JSX rejects a bare `>` in text; Svelte only needs its braces protected.
	const safe = framework === "react" ? escaped.replace(/>/g, "&gt;") : escaped;
	return safe.replace(/[{}]/g, (brace) => `{"${brace}"}`);
}

function needsExpression(text: string, framework: Framework): boolean {
	if (/["\\\n]/.test(text)) return true;
	return framework === "svelte" && /[{}]/.test(text);
}

/**
 * A string as a JavaScript expression inside a double-quoted Vue attribute:
 * single-quoted, with anything the attribute would read as markup written as
 * an entity.
 */
export function vueAttributeString(value: string): string {
	const body = value.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n");
	return `'${body}'`.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

/** One attribute as the framework writes it, quoting the value when it needs it. */
export function attribute(name: string, value: PlaygroundScalar, framework: Framework): string {
	if (typeof value === "boolean") {
		if (value) return name;
		return framework === "vue" ? `:${name}="false"` : `${name}={false}`;
	}
	if (typeof value === "number") {
		return framework === "vue" ? `:${name}="${value}"` : `${name}={${value}}`;
	}
	if (!needsExpression(value, framework)) return `${name}="${value}"`;
	if (framework === "vue") return `:${name}="${vueAttributeString(value)}"`;
	return `${name}={${JSON.stringify(value)}}`;
}

/** The usage code for the values that differ from the initial ones. */
export function serializePlayground(input: SerializeInput): string {
	const { framework, component, values, initialValues, callbacks, ports, codeFor } = input;
	const { childrenKey, required = [] } = input;
	const children =
		childrenKey !== undefined && typeof values[childrenKey] === "string"
			? (values[childrenKey] as string)
			: input.children;
	const custom = codeFor?.(values, framework);
	if (custom) return custom;

	const attrs: string[] = [];
	for (const [key, value] of Object.entries(values)) {
		if (key === childrenKey) continue;
		if (value === initialValues[key] && !required.includes(key)) continue;
		// Svelte keeps the registry's own spelling: `class` stays `class`.
		const written =
			framework === "svelte"
				? key
				: (portPropName({ name: key, type: typeof value }, framework, ports) ?? key);
		// A literal cannot be bound with `v-model`: a model is written as the prop it is.
		attrs.push(attribute(written.replace(/^v-model:/, ""), value, framework));
	}
	for (const { name, handler } of callbacks ?? []) {
		if (framework === "svelte") {
			attrs.push(`${name}={${handler}}`);
			continue;
		}
		const written = portEventName(name, framework, ports) ?? name;
		attrs.push(framework === "vue" ? `${written}="${handler}"` : `${written}={${handler}}`);
	}

	const close = children === undefined ? " />" : ">";
	const tail = children === undefined ? "" : `${escapeText(children, framework)}</${component}>`;
	const oneLine = `<${[component, ...attrs].join(" ")}${close}${tail}`;
	if (attrs.length === 0 || [component, ...attrs].join(" ").length + close.length <= MAX_LINE) {
		return oneLine;
	}
	const closing = children === undefined ? "/>" : ">";
	return `<${component}\n${attrs.map((a) => `\t${a}`).join("\n")}\n${closing}${tail}`;
}

export interface ExportInput {
	framework: Framework;
	/** Names to import from the package, as it exports them. */
	importNames: string[];
	code: string;
	/** Things an agent must respect for the code to look right, one per line. */
	constraints?: string[];
}

/** A closing fence inside the code must not end the block early. */
function neutralizeFences(text: string): string {
	return text.replace(/^(\s*)```/gm, "$1\\`\\`\\`");
}

/**
 * The block a person copies into an agent prompt: framework, install line,
 * stylesheet, import, code and constraints, in a fenced text block.
 */
export function buildExportBlock(input: ExportInput): string {
	const { framework, importNames, code, constraints = [] } = input;
	const pkg = PACKAGE_BY_FRAMEWORK[framework];
	const lines = [
		`Framework: ${FRAMEWORK_LABEL[framework]}`,
		`Install: pnpm add ${pkg}`,
		"Stylesheet:",
		INSTALL_SNIPPETS[framework].stylesheet,
		`Import: import { ${importNames.join(", ")} } from "${pkg}";`,
		"Code:",
		code,
	];
	if (constraints.length > 0) {
		lines.push("Constraints:", ...constraints.map((c) => `- ${c}`));
	}
	return `\`\`\`text\n${neutralizeFences(lines.join("\n"))}\n\`\`\``;
}
