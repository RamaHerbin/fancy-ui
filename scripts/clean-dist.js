import { rmSync, readdirSync, statSync, unlinkSync } from "fs";
import { join } from "path";

// Remove internal directories that should not be published
for (const dir of ["dist/builder", "dist/server", "dist/stores", "dist/fancy-ui/_template"]) {
	rmSync(dir, { recursive: true, force: true });
}

// Remove test files and READMEs from dist/fancy-ui
function walk(dir, callback) {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			walk(full, callback);
		} else {
			callback(full);
		}
	}
}

walk("dist/fancy-ui", (file) => {
	if (file.endsWith(".test.js") || file.endsWith(".test.d.ts") || file.endsWith("/README.md")) {
		unlinkSync(file);
	}
});
