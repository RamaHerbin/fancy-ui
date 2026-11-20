import { attribute, type PlaygroundScalar } from "$lib/docs/playground-code.js";
import type { Framework } from "$lib/inspiration/types.js";

/**
 * The usage per framework. The size control is in megabytes for the slider's
 * sake while the component enforces `maxSize` in bytes, so the export converts
 * it (and omits the limit when the control is zero, like the preview does);
 * the selected files are bound the way each framework expects.
 */
export function fileUploadCode(
	values: Record<string, PlaygroundScalar>,
	framework: Framework
): string {
	const attrs: string[] = [];
	if (values.accept) attrs.push(attribute("accept", String(values.accept), framework));
	if (values.multiple === true) attrs.push("multiple");
	const mb = typeof values.maxSizeMb === "number" ? values.maxSizeMb : 0;
	if (mb > 0) attrs.push(attribute("maxSize", mb * 1024 * 1024, framework));
	const maxFiles = typeof values.maxFiles === "number" ? values.maxFiles : 0;
	if (maxFiles > 0) attrs.push(attribute("maxFiles", maxFiles, framework));
	if (values.label) attrs.push(attribute("label", String(values.label), framework));
	if (values.hint) attrs.push(attribute("hint", String(values.hint), framework));
	for (const flag of ["disabled", "required", "invalid", "sound"])
		if (values[flag] === true) attrs.push(flag);
	const props = attrs.map((a) => `\n\t${a}`).join("");
	if (framework === "vue") {
		return `<script setup lang="ts">
import { ref } from "vue";

const files = ref([]);
</script>

<FileUpload v-model:files="files"${props} />`;
	}
	if (framework === "react") {
		return `const [files, setFiles] = useState([]);

<FileUpload files={files} onFilesChange={setFiles}${props} />`;
	}
	return `<script lang="ts">
let files = $state([]);
</script>

<FileUpload bind:files${props} />`;
}
