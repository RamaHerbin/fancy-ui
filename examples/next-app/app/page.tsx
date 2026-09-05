import type { ReactNode } from "react";
import * as Fancy from "fancy-ui-react";
import { BOOK_COLOR_MAP, SOUND_CUES, cn } from "fancy-ui-react";

/**
 * SERVER COMPONENT — there is deliberately no "use client" in this file.
 *
 * What it proves:
 *
 *  1. `import * as Fancy from "fancy-ui-react"` pulls the ENTIRE barrel through
 *     the RSC compiler. Every component module (and the sound engine) is
 *     resolved on the server; anything that touched `window`/`document` at
 *     module scope, or that landed on the wrong side of the package's
 *     "use client" split, would blow up right here at prerender time.
 *  2. The split really is a split. `cn()` is CALLED below and `SOUND_CUES` and
 *     `BOOK_COLOR_MAP` are READ, on the server, at build time. Those three ship
 *     from modules the build leaves without the directive; were they behind it,
 *     each would arrive here as a client reference and this page would fail with
 *     "Attempted to call cn() from the server". Everything else in the package
 *     is a client module and stays one.
 *  3. Client components render fine when the *caller* is a Server Component,
 *     as long as no prop is a function. Nothing below passes a handler — the
 *     interactive proofs live in /interactive instead.
 *  4. Overlays (Dialog, Tooltip) are safe to prerender in their CLOSED default
 *     state: neither paints a panel until a client-side interaction opens it.
 */

/**
 * Called during the server render, not memoised into a constant a bundler could
 * evaluate away: the point is that the real `cn` runs in this process. The
 * conflict is deliberate — tailwind-merge keeps the last of two `p-*` classes,
 * so a client reference (or a stub) would produce a different string.
 */
const serverMergedClass = cn("p-2 text-neutral-500", "p-3", "font-mono text-[11px]");

export const metadata = {
	title: "Census — fancy-ui-react under RSC",
	description: "Every fancy-ui-react module resolved from a Server Component.",
};

/**
 * A "use client" barrel reaches a Server Component as client *references*, not
 * as the real module namespace. Whether those references are enumerable
 * depends on how the bundler compiled the boundary: Next emits named
 * references when it can statically see the export list, and falls back to an
 * opaque proxy when the module re-exports with `export *` (which this barrel
 * does, 145 times over). So the count is read defensively and the page reports
 * honestly which of the two shapes it actually got — a made-up number here
 * would be worse than a blank.
 */
const barrelExportNames: readonly string[] = (() => {
	try {
		return Object.keys(Fancy as unknown as Record<string, unknown>);
	} catch {
		return [];
	}
})();

function Cell({ name, bucket, children }: { name: string; bucket: string; children: ReactNode }) {
	return (
		<section className="flex flex-col rounded-lg border border-neutral-800 bg-neutral-950 p-3">
			<header className="mb-2 flex items-baseline justify-between gap-2">
				<h2 className="font-mono text-xs text-neutral-100">{name}</h2>
				<span className="font-mono text-[10px] tracking-wide text-neutral-500 uppercase">
					{bucket}
				</span>
			</header>
			<div className="flex min-h-24 flex-1 flex-col items-start justify-center gap-2">
				{children}
			</div>
		</section>
	);
}

/** A sized, positioned host for the components that render as absolute overlays. */
function Stage({ children }: { children: ReactNode }) {
	return (
		<div className="relative h-24 w-full overflow-hidden rounded-md bg-neutral-900">{children}</div>
	);
}

export default function CensusPage() {
	return (
		<main className="min-h-screen bg-neutral-900 p-6 text-neutral-100">
			<header className="mb-6 max-w-3xl">
				<h1 className="text-xl font-semibold">fancy-ui-react — Server Component census</h1>
				<p className="mt-2 text-sm text-neutral-400">
					This page is a Server Component. It namespace-imports the whole package, so every
					module in the barrel is compiled and prerendered here, then renders 34
					representative components spanning every bucket in the library.
				</p>
				<dl className="mt-4 grid grid-cols-1 gap-3 text-xs sm:grid-cols-4">
					<div className="rounded-md border border-neutral-800 bg-neutral-950 p-3">
						<dt className="text-neutral-500">Barrel exports enumerated</dt>
						<dd className="mt-1 font-mono text-base text-neutral-100">
							{barrelExportNames.length > 0 ? barrelExportNames.length : "opaque"}
						</dd>
						<dd className="mt-1 text-[11px] leading-snug text-neutral-500">
							{barrelExportNames.length > 0
								? "Named client references — the bundler kept the export list."
								: "The barrel resolved to an opaque client-reference proxy, so its export names are not enumerable from the server. Rendering still works: each access below returns a live reference."}
						</dd>
					</div>
					<div className="rounded-md border border-neutral-800 bg-neutral-950 p-3">
						<dt className="text-neutral-500">Components rendered here</dt>
						<dd className="mt-1 font-mono text-base text-neutral-100">34</dd>
						<dd className="mt-1 text-[11px] leading-snug text-neutral-500">
							Each one reached through the namespace object, so the module behind it really
							was resolved.
						</dd>
					</div>
					<div className="rounded-md border border-neutral-800 bg-neutral-950 p-3">
						<dt className="text-neutral-500">Values read on the server</dt>
						<dd className="mt-1 font-mono text-base text-neutral-100">
							{Object.keys(SOUND_CUES).length + Object.keys(BOOK_COLOR_MAP).length}
						</dd>
						<dd className={serverMergedClass}>{serverMergedClass}</dd>
						<dd className="mt-1 text-[11px] leading-snug text-neutral-500">
							<code>cn()</code> ran in this process and the two constant tables are real
							objects here, not client references.
						</dd>
					</div>
					<div className="rounded-md border border-neutral-800 bg-neutral-950 p-3">
						<dt className="text-neutral-500">Handlers passed</dt>
						<dd className="mt-1 font-mono text-base text-neutral-100">0</dd>
						<dd className="mt-1 text-[11px] leading-snug text-neutral-500">
							Functions cannot cross the RSC boundary. Dialog opens from its own{" "}
							<code>trigger</code> prop instead.
						</dd>
					</div>
				</dl>
				<nav className="mt-4 flex gap-4 text-sm">
					<a className="text-blue-400 underline" href="/cameleon">
						/cameleon
					</a>
					<a className="text-blue-400 underline" href="/interactive">
						/interactive
					</a>
				</nav>
			</header>

			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{/* ---------- CSS-only effects ---------- */}
				<Cell name="BorderBeam" bucket="css">
					<Stage>
						<Fancy.BorderBeam size={120} duration={8} />
					</Stage>
				</Cell>

				<Cell name="ShimmerButton" bucket="css">
					<Fancy.ShimmerButton>Shimmer</Fancy.ShimmerButton>
				</Cell>

				<Cell name="Meteors" bucket="css">
					<Stage>
						<Fancy.Meteors count={8} seed={3} />
					</Stage>
				</Cell>

				<Cell name="Ripple" bucket="css">
					<Stage>
						<Fancy.Ripple baseCircleSize={70} numberOfCircles={4} spaceBetweenCircle={30} />
					</Stage>
				</Cell>

				<Cell name="GlowBorder" bucket="css">
					<Stage>
						<Fancy.GlowBorder color={["#ffaa40", "#9c40ff"]} borderRadius={6} />
					</Stage>
				</Cell>

				<Cell name="NeonBorder" bucket="css">
					<Fancy.NeonBorder animationType="half" duration={6}>
						<div className="px-4 py-6 text-xs text-neutral-300">Neon</div>
					</Fancy.NeonBorder>
				</Cell>

				<Cell name="RainbowButton" bucket="css">
					<Fancy.RainbowButton speed={3}>Rainbow</Fancy.RainbowButton>
				</Cell>

				<Cell name="LetterPullup" bucket="css">
					<Fancy.LetterPullup words="Prerendered" className="text-lg font-semibold" />
				</Cell>

				<Cell name="Skeleton" bucket="css">
					<Fancy.Skeleton variant="text" lines={3} className="w-full" />
				</Cell>

				{/* ---------- Canvas / graphics ---------- */}
				<Cell name="MatrixRain" bucket="canvas">
					<Stage>
						<Fancy.MatrixRain glyphSize={10} density={0.8} seed={7} />
					</Stage>
				</Cell>

				<Cell name="Sparkles" bucket="canvas">
					<Stage>
						<Fancy.Sparkles particleDensity={40} background="#0d47a1" seed={4} />
					</Stage>
				</Cell>

				<Cell name="FlickeringGrid" bucket="canvas">
					<Stage>
						<Fancy.FlickeringGrid color="#60a5fa" squareSize={3} gridGap={5} seed={2} />
					</Stage>
				</Cell>

				<Cell name="StarsBackground" bucket="canvas">
					<Stage>
						<Fancy.StarsBackground className="h-full w-full" seed={6} />
					</Stage>
				</Cell>

				<Cell name="PixelLoader" bucket="canvas">
					<Fancy.PixelLoader color="#a3a3a3" cols={5} rows={5} />
				</Cell>

				{/* ---------- WebGL ---------- */}
				<Cell name="FluidCursor" bucket="webgl">
					<Stage>
						<Fancy.FluidCursor contained splatOnMount autoSplat autoSplatInterval={1200} />
					</Stage>
				</Cell>

				{/* ---------- Motion ---------- */}
				<Cell name="PulseBeam" bucket="motion">
					<Fancy.PulseBeam palette="ocean" radius={10} className="w-full">
						<div className="rounded-[10px] bg-neutral-900 px-4 py-6 text-xs text-neutral-300">
							Breathing glow
						</div>
					</Fancy.PulseBeam>
				</Cell>

				<Cell name="MosaicGlow" bucket="motion">
					<Fancy.MosaicGlow className="h-24 w-full rounded-md" tileSize={12} seed={5} />
				</Cell>

				<Cell name="Marquee" bucket="motion">
					<Fancy.Marquee pauseOnHover repeat={3} className="w-full [--duration:14s]">
						<span className="mx-3 text-xs text-neutral-300">fancy-ui-react</span>
					</Fancy.Marquee>
				</Cell>

				<Cell name="NumberTicker" bucket="motion">
					<Fancy.NumberTicker value={145} className="text-2xl font-semibold" />
				</Cell>

				<Cell name="FlipWords" bucket="motion">
					<Fancy.FlipWords words={["server", "client", "hydrated"]} className="text-lg" />
				</Cell>

				<Cell name="HyperText" bucket="motion">
					<Fancy.HyperText text="RSC SAFE" seed={9} className="text-lg font-semibold" />
				</Cell>

				<Cell name="TypingIndicator" bucket="motion">
					<Fancy.TypingIndicator size={7} />
				</Cell>

				{/* ---------- Headless / form ---------- */}
				<Cell name="Button" bucket="form">
					<Fancy.Button variant="primary" size="sm">
						Primary
					</Fancy.Button>
					<Fancy.Button variant="outline" size="sm" disabled>
						Disabled
					</Fancy.Button>
				</Cell>

				<Cell name="Input" bucket="form">
					<Fancy.Input type="email" placeholder="you@example.com" label="Email" />
				</Cell>

				<Cell name="Checkbox" bucket="form">
					<Fancy.Checkbox defaultChecked>Ship it</Fancy.Checkbox>
				</Cell>

				<Cell name="Switch" bucket="form">
					<Fancy.Switch defaultChecked size="sm">
						Notifications
					</Fancy.Switch>
				</Cell>

				<Cell name="Label" bucket="form">
					<Fancy.Label htmlFor="census-note" required>
						Note
					</Fancy.Label>
					<Fancy.Input id="census-note" placeholder="Optional" />
				</Cell>

				<Cell name="Toggle" bucket="form">
					<Fancy.Toggle label="Bold" pressed>
						B
					</Fancy.Toggle>
				</Cell>

				<Cell name="Slider" bucket="form">
					<Fancy.Slider value={40} showValue showBounds label="Volume" className="w-full" />
				</Cell>

				<Cell name="Breadcrumb" bucket="form">
					<Fancy.Breadcrumb
						items={[
							{ label: "Home", href: "/" },
							{ label: "Examples", href: "/" },
							{ label: "Census" },
						]}
					/>
				</Cell>

				<Cell name="CopyButton" bucket="form">
					<Fancy.CopyButton value="pnpm add fancy-ui-react" size="sm" />
				</Cell>

				{/* ---------- Overlays, closed default state ---------- */}
				<Cell name="Dialog" bucket="overlay">
					<Fancy.Dialog
						title="Rendered from the server"
						description="The panel mounts only once the trigger is activated on the client."
						trigger={
							<Fancy.Button variant="outline" size="sm">
								Open dialog
							</Fancy.Button>
						}
					>
						<p className="text-sm">
							None of this body reaches the prerendered HTML — the closed state is what a
							Server Component can safely emit.
						</p>
					</Fancy.Dialog>
				</Cell>

				<Cell name="Tooltip" bucket="overlay">
					<Fancy.Tooltip content="Mounted by a Server Component">
						<Fancy.Button variant="ghost" size="sm">
							Hover me
						</Fancy.Button>
					</Fancy.Tooltip>
				</Cell>

				{/* ---------- Sound engine ---------- */}
				<Cell name="SoundToggle" bucket="sound">
					<Fancy.SoundToggle showLabel />
				</Cell>
			</div>
		</main>
	);
}
