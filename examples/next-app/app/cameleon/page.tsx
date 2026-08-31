import type { ReactNode } from "react";
import {
	Badge,
	Button,
	Checkbox,
	FancyProvider,
	Input,
	Select,
	Slider,
	Switch,
	Textarea,
	Tooltip,
	brutalSkin,
	defaultSkin,
	terminalSkin,
	type Skin,
} from "fancy-ui-react/cameleon";

/**
 * SERVER COMPONENT — no "use client" here either.
 *
 * The cameleon engine ships from its own subpath export, `fancy-ui-react/cameleon`,
 * and that barrel carries its own "use client" banner. Two things get proven here
 * that the root barrel cannot prove on its own:
 *
 *  1. The SUBPATH resolves and prerenders. `exports["./cameleon"]` in the package
 *     manifest has to line up with the built `dist/cameleon/index.js`, or this
 *     import fails at build time.
 *  2. A skin — a plain object whose `recipes` are FUNCTIONS — can be handed from
 *     a Server Component to the client `<FancyProvider>`. Functions are not
 *     serializable across the RSC boundary, so this would be impossible for a
 *     locally-defined object. It works because a value imported out of a
 *     "use client" module is a *client reference*: the server serializes the
 *     reference, and the client resolves it back to the real skin, recipes and all.
 *
 * The flip side of (2), and the reason nothing below reads `skin.label` or
 * `skin.tokens`: from this file those objects are opaque references, not the real
 * data. Every visible string is written out here rather than pulled off the skin.
 */

export const metadata = {
	title: "Cameleon skins — fancy-ui-react under RSC",
	description: "The cameleon subpath export, driven from a Server Component.",
};

function Row({ children }: { children: ReactNode }) {
	return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

/**
 * One skin, one panel. `skin` is typed `Skin` even though what actually arrives
 * at runtime is a client reference — the type is what the client component will
 * see once React resolves it, which is the contract that matters.
 */
function SkinPanel({
	skin,
	name,
	blurb,
}: {
	skin: Skin;
	name: string;
	blurb: string;
}) {
	return (
		<section className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
			<header className="mb-3">
				<h2 className="font-mono text-sm text-neutral-100">{name}</h2>
				<p className="mt-1 text-xs text-neutral-500">{blurb}</p>
			</header>

			<FancyProvider skin={skin} manageColorScheme className="rounded-md p-4">
				<div className="flex flex-col gap-4">
					<Row>
						<Button variant="primary" size="sm">
							Primary
						</Button>
						<Button variant="secondary" size="sm">
							Secondary
						</Button>
						<Button variant="destructive" size="sm">
							Delete
						</Button>
						<Button variant="primary" size="sm" loading>
							Saving
						</Button>
					</Row>

					<Row>
						<Badge>Default</Badge>
						<Badge variant="solid">Solid</Badge>
						<Badge variant="green">Ready</Badge>
						<Badge variant="red">Failed</Badge>
					</Row>

					<Row>
						{/* `defaultValue`, not `value`: nothing here can pass an onChange across
						    the RSC boundary, and a bare `value` would make the field read-only
						    and warn in the console. */}
						<Input defaultValue="fancy-ui-react" placeholder="Package" aria-label="Package" />
						<Select defaultValue="rsc" aria-label="Rendering mode">
							<option value="rsc">Server Component</option>
							<option value="csr">Client Component</option>
						</Select>
					</Row>

					<Textarea
						defaultValue="Same component API, a completely different art direction."
						rows={2}
						aria-label="Notes"
					/>

					<Row>
						<Checkbox defaultChecked>Prerendered</Checkbox>
						<Switch checked aria-label="Live updates" />
						<Tooltip content="Skin recipes crossed the boundary as a client reference." />
					</Row>

					<Slider defaultValue={60} min={0} max={100} aria-label="Intensity" />
				</div>
			</FancyProvider>
		</section>
	);
}

export default function CameleonPage() {
	return (
		<main className="min-h-screen bg-neutral-900 p-6 text-neutral-100">
			<header className="mb-6 max-w-3xl">
				<h1 className="text-xl font-semibold">cameleon — three skins, one Server Component</h1>
				<p className="mt-2 text-sm text-neutral-400">
					Ten primitives rendered three times over. The markup is identical in each panel;
					only the <code>skin</code> prop on <code>FancyProvider</code> changes.
				</p>
				<nav className="mt-4 flex gap-4 text-sm">
					<a className="text-blue-400 underline" href="/">
						/
					</a>
					<a className="text-blue-400 underline" href="/interactive">
						/interactive
					</a>
				</nav>
			</header>

			<div className="grid gap-4 xl:grid-cols-3">
				<SkinPanel
					skin={defaultSkin}
					name="defaultSkin"
					blurb="The neutral baseline the other skins deviate from."
				/>
				<SkinPanel
					skin={brutalSkin}
					name="brutalSkin"
					blurb="Hard borders, offset shadows, and an ornament slot the skin fills itself."
				/>
				<SkinPanel
					skin={terminalSkin}
					name="terminalSkin"
					blurb="Monospace, dark color scheme — driven by manageColorScheme on the provider."
				/>
			</div>
		</main>
	);
}
