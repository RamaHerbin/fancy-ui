/**
 * Mini-TeX parser for the handwritten formula (shared core: byte-identical in the Svelte, React
 * and Vue packages). It reads the small subset a speech bubble needs and never throws: anything
 * it does not know is written out as letters.
 */

export type MathNode =
	| { type: "char"; ch: string }
	| { type: "space"; width: number; text: boolean }
	| { type: "group"; items: MathNode[] }
	| { type: "word"; text: string; limits: boolean }
	| { type: "bigop"; ch: string; limits: boolean }
	| { type: "scripts"; base: MathNode | null; sup: MathNode | null; sub: MathNode | null }
	| { type: "frac"; num: MathNode; den: MathNode }
	| { type: "sqrt"; body: MathNode; index: MathNode | null }
	| { type: "fenced"; open: string; close: string; body: MathNode };

const GREEK: Record<string, string> = {
	alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", varepsilon: "ε", zeta: "ζ",
	eta: "η", theta: "θ", vartheta: "θ", iota: "ι", kappa: "κ", lambda: "λ", mu: "μ", nu: "ν",
	xi: "ξ", omicron: "ο", pi: "π", rho: "ρ", sigma: "σ", tau: "τ", upsilon: "υ", phi: "φ",
	varphi: "φ", chi: "χ", psi: "ψ", omega: "ω", Gamma: "Γ", Delta: "Δ", Theta: "Θ",
	Lambda: "Λ", Xi: "Ξ", Pi: "Π", Sigma: "Σ", Upsilon: "Υ", Phi: "Φ", Psi: "Ψ", Omega: "Ω",
};

const SYMBOLS: Record<string, string> = {
	infty: "∞", to: "→", rightarrow: "→", mapsto: "↦", Rightarrow: "⇒", implies: "⇒", in: "∈",
	partial: "∂", nabla: "∇", cdot: "·", times: "×", pm: "±", leq: "≤", le: "≤", geq: "≥",
	ge: "≥", neq: "≠", ne: "≠", approx: "≈", forall: "∀", exists: "∃", subset: "⊂", ldots: "…",
	cdots: "⋯", prime: "′",
};

const BIG_OPS: Record<string, { ch: string; limits: boolean }> = {
	sum: { ch: "∑", limits: true },
	prod: { ch: "∏", limits: true },
	int: { ch: "∫", limits: false },
	iint: { ch: "∬", limits: false },
	oint: { ch: "∮", limits: false },
};

const OP_NAMES = new Set(["inf", "sup", "min", "max", "lim", "log", "ln", "exp", "sin", "cos", "tan"]);
const OP_LIMITS = new Set(["inf", "sup", "min", "max", "lim"]);

const SPACES: Record<string, number> = { ",": 0.17, ":": 0.22, ">": 0.22, ";": 0.28, " ": 0.25, quad: 1, qquad: 2, "!": 0 };

const PAIRS: Record<string, string> = { "(": ")", "[": "]" };

class Parser {
	private i = 0;
	private leftDepth = 0;
	constructor(private readonly src: string) {}

	parse(): MathNode {
		return { type: "group", items: this.list(null) };
	}

	/** Reads atoms until `stop` (a closing char) or the end; consumes the stop char. */
	private list(stop: string | null): MathNode[] {
		const items: MathNode[] = [];
		while (this.i < this.src.length) {
			const c = this.src[this.i];
			if (stop !== null && c === stop) {
				this.i++;
				return items;
			}
			if (c === "}" && stop !== "}") {
				this.i++; // stray closing brace: skip it
				continue;
			}
			if (this.peekCommand() === "right") {
				if (this.leftDepth > 0 && stop !== "}") return items;
				this.command();
				this.i++; // swallow the delimiter after a stray \right
				continue;
			}
			if (c === "^" || c === "_") {
				this.attachScripts(items, null);
				continue;
			}
			const atom = this.atom();
			if (atom === null) continue;
			this.attachScripts(items, atom);
		}
		return items;
	}

	private attachScripts(items: MathNode[], base: MathNode | null): void {
		let sup: MathNode | null = null;
		let sub: MathNode | null = null;
		while (this.i < this.src.length) {
			const c = this.src[this.i];
			if (c === "'") {
				this.i++;
				sup = appendTo(sup, { type: "char", ch: "′" });
			} else if (c === "^" || c === "_") {
				this.i++;
				const arg = this.argument();
				if (arg === null) continue;
				if (c === "^") sup = appendTo(sup, arg);
				else sub = appendTo(sub, arg);
			} else break;
		}
		if (sup === null && sub === null) {
			if (base !== null) items.push(base);
			return;
		}
		items.push({ type: "scripts", base, sup, sub });
	}

	/** A script or command argument: a braced group or a single atom. */
	private argument(): MathNode | null {
		while (this.src[this.i] === " ") this.i++;
		if (this.i >= this.src.length) return null;
		if (this.src[this.i] === "{") {
			this.i++;
			return { type: "group", items: this.list("}") };
		}
		return this.atom();
	}

	private peekCommand(): string | null {
		if (this.src[this.i] !== "\\") return null;
		const m = /^[A-Za-z]+/.exec(this.src.slice(this.i + 1));
		return m ? m[0] : (this.src[this.i + 1] ?? null);
	}

	private command(): string {
		this.i++; // backslash
		const m = /^[A-Za-z]+/.exec(this.src.slice(this.i));
		if (m) {
			this.i += m[0].length;
			return m[0];
		}
		const ch = this.src[this.i] ?? "";
		this.i++;
		return ch;
	}

	private atom(): MathNode | null {
		const c = this.src[this.i]!;
		if (c === "{") {
			this.i++;
			return { type: "group", items: this.list("}") };
		}
		if (c === "\\") return this.commandAtom();
		this.i++;
		if (c === " " || c === "\t" || c === "\n") {
			while (/\s/.test(this.src[this.i] ?? "")) this.i++;
			return { type: "space", width: 0.3, text: true };
		}
		const close = PAIRS[c];
		if (close !== undefined && this.src.indexOf(close, this.i) !== -1) {
			const body: MathNode = { type: "group", items: this.list(close) };
			return { type: "fenced", open: c, close, body };
		}
		return { type: "char", ch: c };
	}

	private commandAtom(): MathNode | null {
		const name = this.command();
		if (name === "") return null;
		if (name in SPACES) return { type: "space", width: SPACES[name]!, text: false };
		if (name in GREEK) return { type: "char", ch: GREEK[name]! };
		if (name in SYMBOLS) return { type: "char", ch: SYMBOLS[name]! };
		if (name in BIG_OPS) return { type: "bigop", ...BIG_OPS[name]! };
		if (OP_NAMES.has(name)) return { type: "word", text: name, limits: OP_LIMITS.has(name) };
		if (name === "{" || name === "}" || name === "\\" || name === "%" || name === "$") {
			return name === "\\" ? { type: "space", width: 0.3, text: true } : { type: "char", ch: name };
		}
		if (name === "frac" || name === "dfrac" || name === "tfrac") {
			const num = this.argument() ?? empty();
			const den = this.argument() ?? empty();
			return { type: "frac", num, den };
		}
		if (name === "sqrt") {
			let index: MathNode | null = null;
			if (this.src[this.i] === "[") {
				this.i++;
				index = { type: "group", items: this.list("]") };
			}
			return { type: "sqrt", body: this.argument() ?? empty(), index };
		}
		if (name === "left") {
			const open = this.delimiter();
			this.leftDepth++;
			const body: MathNode = { type: "group", items: this.list(null) };
			this.leftDepth--;
			let close = "";
			if (this.peekCommand() === "right") {
				this.command();
				close = this.delimiter();
			}
			return { type: "fenced", open, close, body };
		}
		if (name === "mathrm" || name === "text" || name === "operatorname" || name === "mathbf") {
			return this.argument() ?? empty();
		}
		if (name.length === 1) return { type: "char", ch: name };
		return { type: "word", text: name, limits: false };
	}

	/** The delimiter after \left or \right; "." means none. */
	private delimiter(): string {
		while (this.src[this.i] === " ") this.i++;
		if (this.src[this.i] === "\\") {
			const name = this.command();
			if (name === "{" || name === "}") return name;
			if (name === "|") return "‖";
			return name === "langle" ? "⟨" : name === "rangle" ? "⟩" : "";
		}
		const c = this.src[this.i] ?? "";
		this.i++;
		return c === "." ? "" : c;
	}
}

function empty(): MathNode {
	return { type: "group", items: [] };
}

function appendTo(target: MathNode | null, node: MathNode): MathNode {
	if (target === null) return node;
	if (target.type === "group") return { type: "group", items: [...target.items, node] };
	return { type: "group", items: [target, node] };
}

/** Parses a mini-TeX formula. Never throws: on an internal error the source is kept as letters. */
export function parseFormula(src: string): MathNode {
	try {
		return new Parser(src).parse();
	} catch {
		return { type: "group", items: Array.from(src, (ch): MathNode => ({ type: "char", ch })) };
	}
}
