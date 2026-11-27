import * as core from '@actions/core'

import type { Settings } from './inputs.types'

export const parseInputs = (): Settings => {
    const token = core.getInput('token')
    if (!token)
        throw new Error(
            'The token input is empty. Add a classic token as a secret.'
        )
    core.setSecret(token)

    const workflowToken = core.getInput('github-token')
    if (workflowToken) core.setSecret(workflowToken)

    const rawHours = core.getInput('since-hours')
    const sinceHours = Number(rawHours)
    if (!Number.isFinite(sinceHours) || sinceHours <= 0) {
        throw new Error(
            `since-hours must be a positive number, got "${rawHours}"`
        )
    }

    return {
        backfill: core.getBooleanInput('backfill'),
        dryRun: core.getBooleanInput('dry-run'),
        exclude: core
            .getMultilineInput('exclude')
            .flatMap(line => line.split(','))
            .map(pattern => pattern.trim())
            .filter(Boolean),
        includeOrgs: core.getBooleanInput('include-orgs'),
        sinceHours,
        token,
        workflowToken,
    }
}
