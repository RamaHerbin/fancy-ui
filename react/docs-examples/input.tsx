import { useState } from "react";
import { Input } from "fancy-ui-react";

export function InputExample() {
	const [email, setEmail] = useState("");

	return (
		<Input
			value={email}
			onValueChange={setEmail}
			type="email"
			placeholder="name@example.com"
			label="Email"
		/>
	);
}
