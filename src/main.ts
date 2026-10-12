import * as core from '@actions/core'

import { createApi } from './api'
import { collectCandidates } from './candidates'
import { parseInputs } from './inputs'
import { keepAlive, workflowFileOf } from './keepalive'
import { renderSummary, runFailed } from './summary'
import { checkToken } from './token'
import { watchAll } from './watch'

const run = async () => {
    const settings = parseInputs((name) => core.getInput(name))
    const api = createApi(settings.token, core.getInput('github-token'))

    checkToken(await api.identity())

    const candidates = await collectCandidates(api, settings, new Date())
    for (const warning of candidates.warnings) core.warning(warning)

    const result = await watchAll(api, candidates.repos, settings.dryRun)
    for (const name of result.watched) {
        core.info(`${settings.dryRun ? 'Would watch' : 'Watching'} ${name}`)
    }
    for (const { fullName, reason } of result.failed) core.warning(`${fullName}: ${reason}`)

    const repository = process.env.GITHUB_REPOSITORY
    const workflowRef = process.env.GITHUB_WORKFLOW_REF
    if (repository && workflowRef && !settings.dryRun) {
        const warning = await keepAlive(api, repository, workflowFileOf(workflowRef))
        if (warning) {
            core.warning(warning)
            candidates.warnings.push(warning)
        }
    }

    core.setOutput('watched', result.watched.length)
    core.setOutput('watched-repos', JSON.stringify(result.watched))
    await core.summary.addRaw(renderSummary(result, candidates, settings.dryRun)).write()

    if (runFailed(result)) core.setFailed('Every watch attempt failed. See the warnings above.')
}

run().catch((error) => core.setFailed((error as Error).message))
