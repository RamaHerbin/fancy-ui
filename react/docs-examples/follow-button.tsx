import { useState } from "react";
import { FollowButton, Switch } from "fancy-ui-react";

export function FollowButtonExample() {
	const [following, setFollowing] = useState(false);
	const [failNext, setFailNext] = useState(false);

	// A fake server: every request takes 800 ms. With the switch on, the next
	// one is refused, so the rollback and the retry can both be watched.
	async function onToggle() {
		await new Promise((resolve) => setTimeout(resolve, 800));
		if (failNext) {
			setFailNext(false);
			throw new Error("The server said no");
		}
	}

	return (
		<div className="flex flex-col items-center gap-4">
			<FollowButton
				sound
				following={following}
				onFollowingChange={setFollowing}
				onToggle={onToggle}
				label="Follow Rama"
			/>
			<Switch checked={failNext} onCheckedChange={setFailNext}>
				Fail next request
			</Switch>
		</div>
	);
}
