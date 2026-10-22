// Mirrors src/lib/components/docs/examples/pagination/BasicUsage.svelte.
import { useState } from "react";
import { Pagination } from "fancy-ui-react";

export default function Scenario() {
	const [page, setPage] = useState(1);

	return <Pagination sound page={page} onPageChange={setPage} count={12} />;
}
