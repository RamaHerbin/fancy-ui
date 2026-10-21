import { useState } from "react";
import { Button } from "fancy-ui-react";

export function ButtonExample() {
	const [count, setCount] = useState(0);

	return (
		<Button sound onClick={() => setCount((n) => n + 1)}>
			Clicked {count} {count === 1 ? "time" : "times"}
		</Button>
	);
}
