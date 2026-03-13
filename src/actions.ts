export function parseListInput(input?: string): string[] {
	return input ? input.split(/[|,\s]+/).filter(Boolean) : []
}
