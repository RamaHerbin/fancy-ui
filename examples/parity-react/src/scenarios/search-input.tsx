// Mirrors src/lib/components/docs/DemoRenderer.svelte, slug "search-input":
// <SearchInput label="Search" placeholder="Search components" /> with no children.
import { SearchInput } from "fancy-ui-react";

export default function Scenario() {
	return (
		<div className="w-full max-w-sm px-6">
			<SearchInput label="Search" placeholder="Search components" />
		</div>
	);
}
