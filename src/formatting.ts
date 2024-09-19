export function renderMarkdownTable(rows: string[][], headers: string[] = []): string {
	if (!rows.length) {
		return ''
	}
	const align = [':---', ':---:', ':---:', ':---:'].slice(0, rows[0].length)
	const lines = [headers, align, ...rows].filter(Boolean)
	return lines.map((columns) => `| ${columns.join(' | ')} |`).join('\n')
}

export function renderAccordion(summary: string, content: string, { open = false }: { open?: boolean } = {}): string {
	summary = `<summary><strong>${summary}</strong></summary>`
	content = `\n\n${content.trim()}\n\n`
	return `<details ${open ? 'open' : ''}>${summary}\n\n${content.trim()}\n\n</details>`
}

export function renderCodeBlock(code: string, lang: string = ''): string {
	return `\`\`\`${lang}\n${code}\n\`\`\``
}

export function formatDuration(milliseconds: number): string {
	const SECOND = 1000
	const MINUTE = 60 * SECOND
	const HOUR = 60 * MINUTE
	const DAY = 24 * HOUR

	let remaining = milliseconds

	const days = Math.floor(remaining / DAY)
	remaining %= DAY

	const hours = Math.floor(remaining / HOUR)
	remaining %= HOUR

	const minutes = Math.floor(remaining / MINUTE)
	remaining %= MINUTE

	const seconds = +(remaining / SECOND).toFixed(minutes ? 0 : 1)

	return [
		days && `${days} ${n('day', days)}`,
		hours && `${hours} ${n('hour', hours)}`,
		minutes && `${minutes} ${n('minute', minutes)}`,
		seconds && `${seconds} ${n('second', seconds)}`
	]
		.filter(Boolean)
		.join(', ')
}

export function upperCaseFirst(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1)
}

export function n(str: string, count: number): string {
	return count === 1 ? str : `${str}s`
}
