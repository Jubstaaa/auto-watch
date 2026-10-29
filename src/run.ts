import { collectCandidates } from './candidates'
import { keepAlive, workflowFileOf } from './keepalive'
import { hidePrivate, repoLabel, runFailed } from './summary'
import { checkToken } from './token'
import { watchAll } from './watch'

import type { GitHubApi } from './api'
import type { Settings } from './inputs.types'
import type { Report } from './summary'

export interface RunEnv {
    repository?: string
    workflowRef?: string
}

export interface RunOutcome {
    watched: string[]
    log: string[]
    warnings: string[]
    report: Report | null
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
        return { watched: [], log: [], warnings, report: null, failure }
    }

    const candidates = await collectCandidates(api, settings, now)
    candidates.warnings.push(...warnings)

    const result = await watchAll(api, candidates.repos, settings.dryRun)
    const verb = settings.dryRun ? 'Would watch' : 'Watching'
    const privateNames = new Set(
        candidates.repos.filter((repo) => repo.private).map((repo) => repo.fullName)
    )
    const { shown, hidden } = hidePrivate(result.watched, privateNames)

    return {
        watched: result.watched,
        log: [...shown, ...(hidden ? [hidden] : [])].map((name) => `${verb} ${name}`),
        warnings: [
            ...candidates.warnings,
            ...result.failed.map(
                ({ fullName, reason }) => `${repoLabel(fullName, privateNames)}: ${reason}`
            ),
        ],
        report: { result, candidates, privateNames, dryRun: settings.dryRun },
        failure: runFailed(result) ? 'Every watch attempt failed. See the warnings above.' : null,
    }
}
