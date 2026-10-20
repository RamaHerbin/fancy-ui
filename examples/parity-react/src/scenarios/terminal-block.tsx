// Mirrors src/lib/components/docs/examples/terminal-block/BasicUsage.svelte.
import { useEffect, useState } from "react";
import { TerminalBlock } from "fancy-ui-react";

const ESC = "\u001b";
const green = (text: string) => `${ESC}[32m${text}${ESC}[0m`;
const yellow = (text: string) => `${ESC}[33m${text}${ESC}[0m`;
const cyan = (text: string) => `${ESC}[36m${text}${ESC}[0m`;
const bold = (text: string) => `${ESC}[1m${text}${ESC}[0m`;

const TRANSCRIPT: { text: string; wait: number }[] = [
	{ text: `${bold("building for production…")}`, wait: 700 },
	{ text: `${green("✓")} 214 modules transformed`, wait: 900 },
	{ text: `${yellow("warning:")} "createElapsed" is exported but never used`, wait: 500 },
	{ text: `${cyan("build/entry.js")}      12.4 kB │ gzip:  4.1 kB`, wait: 260 },
	{ text: `${cyan("build/app.js")}        94.7 kB │ gzip: 28.9 kB`, wait: 260 },
	{ text: `${cyan("build/styles.css")}     8.2 kB │ gzip:  2.3 kB`, wait: 420 },
	{ text: `${green("✓")} built in ${bold("3.42s")}`, wait: 600 },
];

const FULL = TRANSCRIPT.map((line) => line.text).join("\n") + "\n";
const DURATION_MS = 3420;
const REPLAY_PAUSE = 3200;

export default function Scenario() {
	const [output, setOutput] = useState("");
	const [running, setRunning] = useState(false);
	const [exitCode, setExitCode] = useState<number | null>(null);

	useEffect(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			setOutput(FULL);
			setExitCode(0);
			return;
		}

		let timer: ReturnType<typeof setTimeout>;
		let i = 0;
		let acc = "";

		function tick() {
			if (i < TRANSCRIPT.length) {
				acc += `${TRANSCRIPT[i].text}\n`;
				setOutput(acc);
				const wait = TRANSCRIPT[i].wait;
				i += 1;
				timer = setTimeout(tick, wait);
				return;
			}
			setRunning(false);
			setExitCode(0);
			timer = setTimeout(restart, REPLAY_PAUSE);
		}

		function restart() {
			acc = "";
			setOutput("");
			setExitCode(null);
			setRunning(true);
			i = 0;
			timer = setTimeout(tick, 500);
		}

		restart();
		return () => clearTimeout(timer);
	}, []);

	return (
		<div className="w-full max-w-2xl">
			<TerminalBlock
				command="pnpm build"
				output={output}
				running={running}
				exitCode={exitCode}
				durationMs={exitCode === null ? undefined : DURATION_MS}
				maxHeight="15rem"
				header={
					<>
						<span className="flex items-center gap-1.5" aria-hidden="true">
							<span className="size-2.5 rounded-full bg-red-400/90"></span>
							<span className="size-2.5 rounded-full bg-amber-400/90"></span>
							<span className="size-2.5 rounded-full bg-emerald-400/90"></span>
						</span>
						<span className="ml-auto text-xs opacity-60">build.log</span>
					</>
				}
			/>
		</div>
	);
}
