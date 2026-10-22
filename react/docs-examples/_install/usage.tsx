import { BorderBeam, RainbowButton } from "fancy-ui-react";

export function Hero() {
	return (
		<div className="relative overflow-hidden rounded-xl border p-8">
			<RainbowButton>Click me</RainbowButton>
			<BorderBeam colorFrom="#9E7AFF" colorTo="#FE8BBB" />
		</div>
	);
}
