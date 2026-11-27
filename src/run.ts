import type { GitHubApi } from './api'
import type { Candidates } from './candidates'
import type { Settings } from './inputs.types'
import type { Report } from './summary'

import { collectCandidates } from './candidates'
import { errorMessage } from './error-message'
import { keepAlive, workflowFileOf } from './keepalive'
import { hidePrivate, repoLabel, runFailed } from './summary'
import { checkToken } from './token'
import { watchAll } from './watch'

export interface RunEnv {
    repository?: string | undefined
    workflowRef?: string | undefined
}

export interface RunOutcome {
    failure: null | string
    log: string[]
    report: null | Report
    warnings: string[]
    watched: string[]
}

export const runAutoWatch = async (
    api: GitHubApi,
    settings: Settings,
    env: RunEnv,
    now: Date
): Promise<RunOutcome> => {
    const warnings: string[] = []

    if (env.repository && env.workflowRef && !settings.dryRun) {
        const warning = await keepAlive(
            api,
            env.repository,
            workflowFileOf(env.workflowRef)
        )
        if (warning) warnings.push(warning)
    }

    const stopped = (failure: string): RunOutcome => ({
        failure,
        log: [],
        report: null,
        warnings,
        watched: [],
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
        candidates.repos.filter(repo => repo.private).map(repo => repo.fullName)
    )
    const { hidden, shown } = hidePrivate(result.watched, privateNames)

    return {
        failure: runFailed(result)
            ? 'Every watch attempt failed. See the warnings above.'
            : null,
        log: [...shown, ...(hidden ? [hidden] : [])].map(
            name => `${verb} ${name}`
        ),
        report: { candidates, dryRun: settings.dryRun, privateNames, result },
        warnings: [
            ...candidates.warnings,
            ...result.failed.map(
                ({ fullName, reason }) =>
                    `${repoLabel(fullName, privateNames)}: ${reason}`
            ),
        ],
        watched: result.watched,
    }
}
