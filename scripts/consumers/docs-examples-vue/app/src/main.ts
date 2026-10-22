import { createApp, type Component } from "vue";
import "./style.css";

// Every snippet the docs print, copied here unchanged by docs-examples-vue.mjs.
// Each one is mounted in its own app so one failure cannot hide another, and
// every Vue warning or error is recorded for the spec to read.
const modules = import.meta.glob<{ default: Component }>("./examples/**/*.vue", { eager: true });

type Result = { name: string; elements: number; problems: string[] };
const results: Result[] = [];
const root = document.getElementById("app")!;

for (const [path, mod] of Object.entries(modules).sort(([a], [b]) => a.localeCompare(b))) {
	const name = path
		.replace("./examples/", "")
		.replace(/\.vue$/, "")
		.replace(/^_/, "")
		.replace(/\//g, "-");
	const host = document.createElement("section");
	host.dataset.example = name;
	root.appendChild(host);
	const problems: string[] = [];
	try {
		const app = createApp(mod.default);
		app.config.warnHandler = (msg) => problems.push(`warn: ${msg}`);
		app.config.errorHandler = (err) => problems.push(`error: ${String(err)}`);
		app.mount(host);
	} catch (err) {
		problems.push(`throw: ${String(err)}`);
	}
	// Elements, not innerHTML: a snippet that renders only a comment (`<!--v-if-->`) is empty.
	results.push({ name, elements: host.querySelectorAll("*").length, problems });
}

(window as unknown as { __docsExamples: Result[] }).__docsExamples = results;
document.documentElement.dataset.docsExamplesReady = "true";
