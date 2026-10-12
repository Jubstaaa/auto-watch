import { collectCandidates } from './candidates'
import { keepAlive, workflowFileOf } from './keepalive'
import { renderSummary, runFailed } from './summary'
import { checkToken } from './token'
import { watchAll } from './watch'

import type { GitHubApi } from './api'
import type { Settings } from './inputs.types'

export interface RunEnv {
    repository?: string
    workflowRef?: string
}

export interface RunOutcome {
    watched: string[]
    log: string[]
    warnings: string[]
    summary: string
    failure: string | null
}

export const runAutoWatch = async (
    api: GitHubApi,
    settings: Settings,
    env: RunEnv,
    now: Date
): Promise<RunOutcome> => {
    const warnings: string[] = []

    if (env.repository && env.workflowRef && !settings.dryRun) {
        const warning = await keepAlive(api, env.repository, workflowFileOf(env.workflowRef))
        if (warning) warnings.push(warning)
    }

    try {
        checkToken(await api.identity())
    } catch (error) {
        const failure = (error as Error).message
        return { watched: [], log: [], warnings, summary: `## ${failure}`, failure }
    }

    const candidates = await collectCandidates(api, settings, now)
    candidates.warnings.push(...warnings)

    const result = await watchAll(api, candidates.repos, settings.dryRun)
    const verb = settings.dryRun ? 'Would watch' : 'Watching'

    return {
        watched: result.watched,
        log: result.watched.map((name) => `${verb} ${name}`),
        warnings: [
            ...candidates.warnings,
            ...result.failed.map(({ fullName, reason }) => `${fullName}: ${reason}`),
        ],
        summary: renderSummary(result, candidates, settings.dryRun),
        failure: runFailed(result) ? 'Every watch attempt failed. See the warnings above.' : null,
    }
}
