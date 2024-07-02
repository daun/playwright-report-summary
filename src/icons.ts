type IconSet = Record<string, string>
type IconColors = Record<string, string>

const iconSize = 14
const defaultIconStyle = 'octicons'

export const icons: Record<string, IconSet> = {
	octicons: {
		failed: 'stop',
		passed: 'check-circle',
		flaky: 'alert',
		skipped: 'skip',
		stats: 'pulse',
		duration: 'clock',
		link: 'link-external',
		report: 'package',
		commit: 'git-pull-request',
		info: 'info'
	},
	emojis: {
		failed: '❌',
		passed: '✅',
		flaky: '⚠️',
		skipped: '⏭️',
		stats: '',
		duration: '',
		link: '',
		report: '',
		commit: '',
		info: 'ℹ️'
	}
}

const iconColors: IconColors = {
	failed: 'da3633',
	passed: '3fb950',
	flaky: 'd29922',
	skipped: '0967d9',
	icon: 'abb4bf'
}

export function renderIcon(
	status: string,
	{ iconStyle = defaultIconStyle }: { iconStyle?: keyof typeof icons } = {}
): string {
	if (iconStyle === 'emojis') {
		return icons.emojis[status] || ''
	} else {
		const color = iconColors[status] || iconColors.icon
		return createOcticonUrl(icons.octicons[status], { label: status, color })
	}
}

function createOcticonUrl(icon: string, { label = 'icon', color = iconColors.icon, size = iconSize } = {}): string {
	if (icon) {
		return `![${label}](https://icongr.am/octicons/${icon}.svg?size=${size}&color=${color})`
	} else {
		return ''
	}
}
