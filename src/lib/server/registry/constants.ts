/**
 * The registry's fixed strings, spelled once.
 *
 * The two schema URLs are technical dependencies of the file format; this
 * module is the only place that names them. The copy command lives in the
 * client-safe `$lib/copy-source` module and is re-exported here.
 */

export {
	COPY_CLI,
	COPY_IMPORT_ROOT,
	REGISTRY_BASE,
	copyCommandFor,
	copyImportFor,
} from "$lib/copy-source.js";

export const REGISTRY_SCHEMA_URL = "https://ui.shadcn.com/schema/registry.json";
export const REGISTRY_ITEM_SCHEMA_URL = "https://ui.shadcn.com/schema/registry-item.json";
export const REGISTRY_NAME = "fancy-ui";
