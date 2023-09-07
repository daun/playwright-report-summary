import fs from 'fs/promises'

export async function fileExists(filename: string): Promise<boolean> {
	try {
		await fs.access(filename, fs.constants.F_OK)
		return true
	} catch (e) {
		return false
	}
}

export async function readFile(path: string): Promise<string> {
	return await fs.readFile(path, { encoding: 'utf8' })
}
