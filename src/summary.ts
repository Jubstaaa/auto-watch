import type { Candidates } from './candidates'
import type { WatchResult } from './watch'

const plural = (count: number) => `${count} repo${count === 1 ? '' : 's'}`

export const runFailed = (result: WatchResult): boolean =>
    result.failed.length > 0 && result.watched.length === 0

export const renderSummary = (
    result: WatchResult,
    candidates: Candidates,
    dryRun: boolean
): string => {
    const headline = dryRun
        ? `Dry run: would watch ${plural(result.watched.length)}`
        : `Watched ${plural(result.watched.length)}`

    const lines = [
        `## ${headline}`,
        '',
        ...result.watched.map((name) => `- \`${name}\``),
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
            ...result.failed.map((f) => `- \`${f.fullName}\`: ${f.reason}`)
        )
    }
    if (candidates.warnings.length) {
        lines.push('', '### Warnings', ...candidates.warnings.map((w) => `- ${w}`))
    }

    return lines.join('\n')
}
