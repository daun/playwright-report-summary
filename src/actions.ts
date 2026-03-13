export function parseListInput(input?: string): string[]
export function parseListInput<const Allowed extends readonly string[]>(
	input: string | undefined,
	allowed: Allowed
): Allowed[number][]
export function parseListInput(input?: string, allowed: readonly string[] = []): string[] {
	return (
		input
			?.split(/[|,\s]+/)
			.filter(Boolean)
			.map((item) => item.trim())
			.filter((item): item is (typeof allowed)[number] => !allowed.length || allowed.includes(item)) || []
	)
}
