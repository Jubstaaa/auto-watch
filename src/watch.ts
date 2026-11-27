import type { GitHubApi } from './api'
import type { Repo } from './api.types'

import { errorMessage } from './error-message'

export interface WatchResult {
    alreadyWatching: string[]
    failed: { fullName: string; reason: string }[]
    ignored: string[]
    watched: string[]
}

export const watchAll = async (
    api: GitHubApi,
    repos: Repo[],
    dryRun: boolean
): Promise<WatchResult> => {
    const result: WatchResult = {
        alreadyWatching: [],
        failed: [],
        ignored: [],
        watched: [],
    }

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
            result.failed.push({ fullName, reason: errorMessage(error) })
        }
    }

    return result
}
