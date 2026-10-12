import * as core from '@actions/core'

import { createApi } from './api'
import { parseInputs } from './inputs'
import { runAutoWatch } from './run'

const main = async () => {
    const settings = parseInputs((name) => core.getInput(name))
    const api = createApi(settings.token, core.getInput('github-token'))

    const outcome = await runAutoWatch(
        api,
        settings,
        {
            repository: process.env.GITHUB_REPOSITORY,
            workflowRef: process.env.GITHUB_WORKFLOW_REF,
        },
        new Date()
    )

    for (const line of outcome.log) core.info(line)
    for (const warning of outcome.warnings) core.warning(warning)

    core.setOutput('watched', outcome.watched.length)
    core.setOutput('watched-repos', JSON.stringify(outcome.watched))
    await core.summary.addRaw(outcome.summary).write()

    if (outcome.failure) core.setFailed(outcome.failure)
}

main().catch((error) => core.setFailed((error as Error).message))
