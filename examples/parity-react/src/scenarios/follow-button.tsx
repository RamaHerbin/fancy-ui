// Mirrors src/lib/components/docs/examples/follow-button/BasicUsage.svelte.
import { useState } from "react";
import { FollowButton } from "fancy-ui-react";

export default function Scenario() {
	const [following, setFollowing] = useState(false);

	return (
		<FollowButton
			sound
			following={following}
			onFollowingChange={setFollowing}
			label="Follow Rama"
		/>
	);
}
