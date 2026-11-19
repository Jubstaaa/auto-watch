import { collectCandidates } from './candidates'
import { errorMessage } from './error-message'
import { keepAlive, workflowFileOf } from './keepalive'
import { hidePrivate, repoLabel, runFailed } from './summary'
import { checkToken } from './token'
import { watchAll } from './watch'

import type { GitHubApi } from './api'
import type { Candidates } from './candidates'
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

    const stopped = (failure: string): RunOutcome => ({
        watched: [],
        log: [],
        warnings,
        report: null,
        failure,
    })

    try {
        checkToken(await api.identity())
    } catch (error) {
        return stopped(errorMessage(error))
    }

    let candidates: Candidates
    try {
        const listed = await collectCandidates(api, settings, now)
        candidates = { ...listed, warnings: [...listed.warnings, ...warnings] }
    } catch (error) {
        return stopped(`Could not list your repos: ${errorMessage(error)}`)
    }

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
