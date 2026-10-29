import type { summary as coreSummary } from '@actions/core'

import type { Candidates } from './candidates'
import type { WatchResult } from './watch'

type Summary = typeof coreSummary

export interface Report {
    result: WatchResult
    candidates: Candidates
    privateNames: Set<string>
    dryRun: boolean
}

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

const addSection = (summary: Summary, heading: string, items: string[]) => {
    if (items.length) summary.addHeading(heading, 3).addList(items)
}

export const renderSummary = (
    summary: Summary,
    { result, candidates, privateNames, dryRun }: Report
): Summary => {
    const { shown, hidden } = hidePrivate(result.watched, privateNames)
    const count = plural(result.watched.length)

    summary.addHeading(dryRun ? `Dry run: would watch ${count}` : `Watched ${count}`, 2)
    if (result.watched.length) {
        summary.addList([
            ...shown.map((name) => `<code>${name}</code>`),
            ...(hidden ? [hidden] : []),
        ])
    }
    summary.addTable([
        [
            { data: '', header: true },
            { data: 'Repos', header: true },
        ],
        ['Already watching', String(result.alreadyWatching.length)],
        ['Ignored by you', String(result.ignored.length)],
        ['Excluded', String(candidates.excluded)],
        ['Failed', String(result.failed.length)],
    ])
    addSection(
        summary,
        'Failed',
        result.failed.map((f) => `${repoLabel(f.fullName, privateNames)}: ${f.reason}`)
    )
    addSection(summary, 'Warnings', candidates.warnings)

    return summary
}
