// Cap on rendered test titles. Keeps the comment well under GitHub's
// 65535-char body limit even for catastrophic-failure runs.
export const MAX_TITLE_LENGTH = 500

// GFM inline metacharacters; backslash-escape neutralizes them as plain text.
const MARKDOWN_INLINE_METACHARACTERS = /[\\`*_{}[\]()#+!|~-]/g

// ANSI CSI / OSC / single-byte escape sequences. Stripped whole so the
// leftover param bytes (e.g. `[31m`) don't survive as visible garbage.
// eslint-disable-next-line no-control-regex
const ANSI_ESCAPE_SEQUENCES = /\x1b(?:\[[0-?]*[ -/]*[@-~]|\][^\x07\x1b]*(?:\x07|\x1b\\)|[@-_])/g

// C0 + DEL + C1 control characters. ESC is included, defeating any ANSI
// sequence the regex above missed.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\x00-\x1f\x7f-\x9f]/g

export function stripControlCharacters(text: string): string {
	return text.replace(ANSI_ESCAPE_SEQUENCES, '').replace(CONTROL_CHARACTERS, '')
}

export function sanitizeTestFilePath(file: string): string {
	return stripControlCharacters(file)
}

export function sanitizeTestTitle(title: string): string {
	const stripped = stripControlCharacters(title)
	return stripped.length <= MAX_TITLE_LENGTH ? stripped : `${stripped.slice(0, MAX_TITLE_LENGTH)}\u2026`
}

export function escapeForMarkdown(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(MARKDOWN_INLINE_METACHARACTERS, '\\$&')
		.replace(/\n/g, ' ')
}

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

export function renderCodeBlock(code: string, lang = ''): string {
	// Adaptive fence (CommonMark): one tick longer than any run inside `code`.
	const longestRun = (code.match(/`+/g) ?? []).reduce((max, run) => Math.max(max, run.length), 0)
	const fence = '`'.repeat(Math.max(3, longestRun + 1))
	return `${fence}${lang}\n${code}\n${fence}`
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
