import { Component, StrictMode, createElement, type ErrorInfo, type ReactNode } from "react";
import * as pkg from "./index.js";
import * as cam from "./cameleon/index.js";

/**
 * What the two package-wide SSR sweeps agree on: which exports they visit, how
 * they build an element, and which of those exports cannot be rendered from a
 * single `children` prop.
 *
 * Shared rather than duplicated because the list below is a frozen contract
 * asserted with `toEqual` in both files. Two copies of a fifty-name list is one
 * update away from two different contracts, and the sweep that was not updated
 * would then be the one nobody reads.
 *
 * Not part of the published package: excluded in `tsconfig.build.json`
 * alongside `test-setup.ts`, so no declaration for it reaches `dist`.
 */

export type Exported = readonly [name: string, value: unknown];

/**
 * Every element a sweep builds, wrapped in `<StrictMode>`.
 *
 * StrictMode's mount → unmount → remount rehearsal is how a leaked listener, a
 * doubled rAF loop or an un-disconnected observer becomes visible, and every
 * consumer running `next dev` gets it for free. The internals hooks are written
 * for it and their own suites prove it; the components that compose them were
 * covered nowhere, so a component that started two loops on remount shipped
 * green and reached a consumer's dev server as doubled animation. Wrapping the
 * two package-wide sweeps covers every swept export in one edit.
 *
 * Server-side the wrapper is inert — there are no effects and no double render
 * on the server — so in the determinism sweep it buys nothing beyond both
 * sweeps rendering the identical tree. It costs nothing either: StrictMode
 * emits no markup of its own, so the HTML is unchanged and hydration still
 * matches.
 */
export function tree(value: unknown, onMountError?: (error: unknown) => void) {
	const element = createElement(value as never, { children: "x" } as never);
	return createElement(
		StrictMode,
		null,
		onMountError ? createElement(MountBoundary, { onMountError }, element) : element
	);
}

interface MountBoundaryProps {
	onMountError: (error: unknown) => void;
	children?: ReactNode;
}

/**
 * Records a component that throws while mounting, identically on React 18 and 19.
 *
 * Without it the hydration sweep learns about a failed mount from `act()`
 * rethrowing, and the two majors disagree: React 19 surfaces the commit-phase
 * error through the `act` call, while React 18 hands it to the scheduler and it
 * arrives as an uncaught window error after the sweep has already judged the
 * component. The frozen throw-list would then differ between the two CI jobs
 * for a reason that has nothing to do with a component. An error boundary is
 * the mechanism both majors have always agreed on.
 *
 * It renders its children untouched until one throws, so the server HTML and
 * the hydrated DOM are the boundary-free ones for every component that works.
 */
class MountBoundary extends Component<MountBoundaryProps, { failed: boolean }> {
	state = { failed: false };

	static getDerivedStateFromError() {
		return { failed: true };
	}

	componentDidCatch(error: Error, _info: ErrorInfo) {
		this.props.onMountError(error);
	}

	render() {
		return this.state.failed ? null : this.props.children;
	}
}

/** Every capitalised component-shaped export of the root barrel and `./cameleon`. */
export function exportedComponents(): Exported[] {
	const out: Exported[] = [];
	for (const [name, value] of Object.entries({ ...pkg, ...cam })) {
		if (typeof value !== "function" && typeof value !== "object") continue;
		if (typeof value === "object") {
			if (!(value && "$$typeof" in (value as object))) continue;
			// A React context object is capitalised and carries `$$typeof`, so it
			// reaches this filter — but it is not a component. React 19 happens to
			// render a bare context as its own provider while React 18 rejects it
			// as an element type, so leaving it in would make the frozen lists
			// below differ between the two CI jobs for a reason that has nothing
			// to do with a component.
			if ((value as { $$typeof?: symbol }).$$typeof === Symbol.for("react.context")) continue;
		}
		if (!/^[A-Z]/.test(name)) continue;
		out.push([name, value]);
	}
	return out;
}

/**
 * Exports neither sweep can server render from `{ children: "x" }` alone. Each
 * is covered by its own colocated suite, which mounts it with real props.
 *
 * Frozen as an exact list, like the hydration sweep's throw-list, and for the
 * same reason. The budget it replaced (`skipped.length < exports / 2`) left
 * room for about 114 names, so a component that regressed into throwing during
 * `renderToString` — a new required prop dereferenced at render, a context read
 * with no provider — moved from "checked" to "skipped" and the suite stayed
 * green. That is the exact regression class these gates exist to catch.
 */
export const NEEDS_PROPS = [
	// A required data prop the sweep does not pass, dereferenced during render.
	"AgentPlan",
	"AiDataTable",
	"AnimatedTestimonials",
	"AnimatedTooltip",
	"AppleCard",
	"AppleCardCarousel",
	"Breadcrumb",
	"ColourfulText",
	"Combobox",
	"CommandMenu",
	"ComposerAttachment",
	"ComposerCommandMenu",
	"ComposerModelPicker",
	"ContextRing",
	"FancyProvider",
	"FlipWords",
	"HyperText",
	"InlineCitation",
	"LetterPullup",
	"PromptSuggestions",
	"SourceCard",
	"Sources",
	"StickyScroll",
	"SubagentList",
	"TerminalBlock",
	"TextGenerateEffect",
	"ThreadList",
	"Toast",
	"ToolCall",
	"ToolTimeline",
	"WebSearch",
	// A part of a compound component: it reads its root's context and throws its
	// own "must be rendered inside its provider" message when the sweep renders
	// it alone. That message is the contract, so the throw is the correct answer.
	"CardItem",
	"ContextMenuContent",
	"ContextMenuItem",
	"ContextMenuSub",
	"ContextMenuSubContent",
	"ContextMenuSubTrigger",
	"ContextMenuTrigger",
	"DockIcon",
	"DockSeparator",
	"DropdownMenuContent",
	"DropdownMenuItem",
	"DropdownMenuSub",
	"DropdownMenuSubContent",
	"DropdownMenuSubTrigger",
	"DropdownMenuTrigger",
	"NavigationMenuContent",
	"NavigationMenuList",
	"NavigationMenuTrigger",
	"PopoverContent",
	// Renders a void element, which React forbids from carrying children — the
	// sweep's single `children` prop is what it rejects, not the component.
	"Input",
	"Slider",
] as const;
