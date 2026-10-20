// Mirrors src/lib/components/docs/examples/file-upload/BasicUsage.svelte.
import { useState } from "react";
import { FileUpload, type UploadFile } from "fancy-ui-react";

export default function Scenario() {
	const [files, setFiles] = useState<UploadFile[]>([]);
	return (
		<div className="w-full max-w-sm">
			<FileUpload sound files={files} onFilesChange={setFiles} hint="PNG, SVG — 4 MB max" />
		</div>
	);
}
