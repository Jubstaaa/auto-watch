import type { Candidates } from './candidates'
import type { WatchResult } from './watch'

const plural = (count: number, noun = 'repo') => `${count} ${noun}${count === 1 ? '' : 's'}`

export const runFailed = (result: WatchResult): boolean =>
    result.failed.length > 0 && result.watched.length === 0

export const hidePrivate = (names: string[], privateNames: Set<string>) => {
    const shown = names.filter((name) => !privateNames.has(name))
    const hidden = names.length - shown.length
    return { shown, hidden: hidden ? plural(hidden, 'private repo') : null }
}

export const repoLabel = (fullName: string, privateNames: Set<string>) =>
    privateNames.has(fullName) ? 'A private repo' : fullName

export const renderSummary = (
    result: WatchResult,
    candidates: Candidates,
    privateNames: Set<string>,
    dryRun: boolean
): string => {
    const headline = dryRun
        ? `Dry run: would watch ${plural(result.watched.length)}`
        : `Watched ${plural(result.watched.length)}`
    const { shown, hidden } = hidePrivate(result.watched, privateNames)

    const lines = [
        `## ${headline}`,
        '',
        ...shown.map((name) => `- \`${name}\``),
        ...(hidden ? [`- ${hidden}`] : []),
        '',
        '| | Repos |',
        '|---|---|',
        `| Already watching | ${result.alreadyWatching.length} |`,
        `| Ignored by you | ${result.ignored.length} |`,
        `| Excluded | ${candidates.excluded} |`,
        `| Failed | ${result.failed.length} |`,
    ]

    if (result.failed.length) {
        lines.push(
            '',
            '### Failed',
            ...result.failed.map((f) => `- ${repoLabel(f.fullName, privateNames)}: ${f.reason}`)
        )
    }
    if (candidates.warnings.length) {
        lines.push('', '### Warnings', ...candidates.warnings.map((w) => `- ${w}`))
    }

    return lines.join('\n')
}
