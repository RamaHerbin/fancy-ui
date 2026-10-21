import { Button, Toaster, toast } from "fancy-ui-react";

export function ToastExample() {
	return (
		<>
			<Toaster sound />
			<Button
				onClick={() =>
					toast({
						title: "Theme saved",
						description: "CSS copied to the clipboard.",
						variant: "success",
					})
				}
			>
				Show toast
			</Button>
		</>
	);
}
