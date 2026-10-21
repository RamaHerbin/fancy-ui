import { Demo } from "./demo";

export default function Page() {
	return (
		<main className="mx-auto flex max-w-3xl flex-col gap-8 p-8">
			<h1 className="text-2xl font-semibold">fancy-ui-react consumer</h1>
			<Demo />
		</main>
	);
}
