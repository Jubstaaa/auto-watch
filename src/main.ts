import * as core from '@actions/core'

import { createApi } from './api'
import { parseInputs } from './inputs'
import { runAutoWatch } from './run'
import { renderSummary } from './summary'

const main = async () => {
    const settings = parseInputs()
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
    if (outcome.report) renderSummary(core.summary, outcome.report)
    else if (outcome.failure) core.summary.addHeading(outcome.failure, 2)
    await core.summary.write()

    if (outcome.failure) core.setFailed(outcome.failure)
}

main().catch((error) => core.setFailed((error as Error).message))
