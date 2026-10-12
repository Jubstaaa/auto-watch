import type { GitHubApi } from './api'
import type { Repo } from './api.types'

export interface WatchResult {
    watched: string[]
    alreadyWatching: string[]
    ignored: string[]
    failed: { fullName: string; reason: string }[]
}

export const watchAll = async (
    api: GitHubApi,
    repos: Repo[],
    dryRun: boolean
): Promise<WatchResult> => {
    const result: WatchResult = { watched: [], alreadyWatching: [], ignored: [], failed: [] }

    for (const { fullName } of repos) {
        try {
            const state = await api.subscription(fullName)
            if (state === 'watching') {
                result.alreadyWatching.push(fullName)
                continue
            }
            if (state === 'ignored') {
                result.ignored.push(fullName)
                continue
            }
            if (!dryRun) await api.watch(fullName)
            result.watched.push(fullName)
        } catch (error) {
            result.failed.push({ fullName, reason: (error as Error).message })
        }
    }

    return result
}
