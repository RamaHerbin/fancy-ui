#!/usr/bin/env node
/**
 * Proves the React 18 half of the peer range, from a scratch consumer.
 *
 * `peerDependencies` advertises `react: ^18.0.0 || ^19.0.0`, so a React 18 app
 * installs this package with no warning — while the workspace pins react 19.1
 * and @types/react 19.x, the only example app pins 19, and CI ran one install.
 * Every React-19-only detail that slipped in would reach a React 18 consumer as
 * a console error or a broken component with a green pipeline behind it.
 *
 * What this covers, and what it does not:
 *
 *  - COVERED: the DECLARATION surface. The package is packed, installed into a
 *    throwaway directory alongside `@types/react@18`, and a probe importing
 *    both entry points is compiled with `skipLibCheck: false`. That is the half
 *    the runtime cannot reach: every emitted `.d.ts` is read, so a type that
 *    only exists in @types/react 19 (`JSX` off the react module, the ref-object
 *    shape, `ReactNode` accepting a promise) fails here.
 *  - COVERED: server rendering under React 18 proper, from the built artifact.
 *  - NOT covered here: the client runtime. That is the other half of the
 *    `react-18` CI job, which re-installs the whole workspace on React 18 with
 *    a pnpm override and runs the package's own hydration sweep and its
 *    `internals` / `sound` suites against it.
 *
 * Run from `react/` after `pnpm run build`. Needs network access for `npm
 * install`, so it is a CI step rather than part of `build`.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const pkg = fileURLToPath(new URL("../", import.meta.url));

/** The floor the peer range promises. Kept in step with package.json. */
const REACT = "18";
const TYPES_REACT = "18";

const scratch = mkdtempSync(join(tmpdir(), "fancy-ui-react-18-"));
const run = (command, args, cwd) =>
	execFileSync(command, args, { cwd, stdio: "inherit", encoding: "utf8" });

try {
	console.log(`React ${REACT} consumer probe in ${scratch}`);

	// Pack the real artifact rather than linking the workspace: a consumer gets
	// the tarball, and the tarball is what the `files` allow-list produced.
	run("npm", ["pack", "--pack-destination", scratch], pkg);
	const tarball = readdirSync(scratch).find((name) => name.endsWith(".tgz"));
	if (!tarball) throw new Error("npm pack produced no tarball");

	writeFileSync(
		join(scratch, "package.json"),
		JSON.stringify({ name: "react18-consumer", private: true, version: "0.0.0", type: "module" })
	);

	run(
		"npm",
		[
			"install",
			"--no-audit",
			"--no-fund",
			`react@^${REACT}`,
			`react-dom@^${REACT}`,
			`@types/react@^${TYPES_REACT}`,
			`@types/react-dom@^${TYPES_REACT}`,
			"typescript@~5.8",
			`./${tarball}`,
		],
		scratch
	);

	// The installed majors, asserted: npm resolving 19 here would make every
	// check below pass for the wrong reason.
	const installed = JSON.parse(
		execFileSync("node", ["-e", "console.log(JSON.stringify(require('react/package.json')))"], {
			cwd: scratch,
			encoding: "utf8",
		})
	);
	if (!installed.version.startsWith(`${REACT}.`)) {
		throw new Error(`expected React ${REACT}.x in the scratch consumer, got ${installed.version}`);
	}
	console.log(`✅ scratch consumer resolved react@${installed.version}`);

	// `bundler` resolution and `skipLibCheck: false`: the templates that hide
	// this class of defect are exactly the ones that set skipLibCheck true.
	writeFileSync(
		join(scratch, "tsconfig.json"),
		JSON.stringify(
			{
				compilerOptions: {
					target: "ES2022",
					lib: ["ES2022", "DOM", "DOM.Iterable"],
					module: "ESNext",
					moduleResolution: "bundler",
					jsx: "react-jsx",
					strict: true,
					skipLibCheck: false,
					noEmit: true,
					types: [],
				},
				include: ["probe.tsx"],
			},
			null,
			2
		)
	);
	writeFileSync(
		join(scratch, "probe.tsx"),
		'import * as F from "fancy-ui-react";\n' +
			'import * as C from "fancy-ui-react/cameleon";\n' +
			"export const probe = [F, C];\n"
	);
	run("npx", ["tsc", "-p", "tsconfig.json"], scratch);
	console.log(`✅ every emitted declaration compiles against @types/react ${TYPES_REACT}`);

	// A runtime pass too: React 18's own renderToStaticMarkup over the barrel.
	writeFileSync(
		join(scratch, "render.mjs"),
		[
			'import { createElement } from "react";',
			'import { renderToStaticMarkup } from "react-dom/server";',
			'import * as F from "fancy-ui-react";',
			'import * as C from "fancy-ui-react/cameleon";',
			"let rendered = 0;",
			"for (const [name, value] of Object.entries({ ...F, ...C })) {",
			'\tif (typeof value !== "function" && typeof value !== "object") continue;',
			'\tif (typeof value === "object" && !(value && "$$typeof" in value)) continue;',
			// A context object is capitalised and carries $$typeof but is not a
			// component; React 18 warns loudly if one is rendered as an element.
			'\tif (value.$$typeof === Symbol.for("react.context")) continue;',
			"\tif (!/^[A-Z]/.test(name)) continue;",
			'\ttry { renderToStaticMarkup(createElement(value, { children: "x" })); rendered += 1; }',
			"\tcatch {}",
			"}",
			"if (rendered < 150) {",
			"\tconsole.error(`only ${rendered} exports server rendered under React 18`);",
			"\tprocess.exit(1);",
			"}",
			"console.log(`✅ ${rendered} exports server render under React 18`);",
		].join("\n")
	);
	run("node", ["render.mjs"], scratch);
} finally {
	rmSync(scratch, { recursive: true, force: true });
}
