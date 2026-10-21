import { BorderBeam, Button, GlowBorder, Input, cn } from "fancy-ui-react";
import { Island } from "./island";

// A Server Component: no client directive here, and none needed. The package marks
// its own modules as client modules, so these imports cross the boundary as
// client references, and `cn` (shipped without the directive) is callable.
// Rendered per request so the determinism check compares two real renders.
export const dynamic = "force-dynamic";

export default function ServerPage() {
	return (
		<main className="mx-auto flex max-w-3xl flex-col gap-8 p-8">
			<h1 className="text-2xl font-semibold">Server Component page</h1>

			<p data-testid="server-cn" className={cn("p-2", "text-sm", "p-2")}>
				{cn("p-2", "text-sm", "p-2")}
			</p>

			<section
				data-testid="light-scope"
				className="bg-background flex flex-wrap items-center gap-3 p-4"
			>
				<Button data-testid="server-button">Server button</Button>
				<Input aria-label="Server input" placeholder="Rendered on the server" />
			</section>

			<section
				data-testid="dark-scope"
				className="dark bg-background text-foreground flex flex-wrap items-center gap-3 p-4"
			>
				<Button>Dark button</Button>
			</section>

			<section className="relative overflow-hidden rounded-xl border p-8">
				<p>A card with a border beam, rendered by a Server Component.</p>
				<BorderBeam />
			</section>

			<section className="bg-background relative flex h-32 items-center justify-center rounded-xl p-6">
				<p>Glow border</p>
				<GlowBorder />
			</section>

			<Island />
		</main>
	);
}
