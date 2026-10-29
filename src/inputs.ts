import * as core from '@actions/core'

import type { Settings } from './inputs.types'

export const parseInputs = (): Settings => {
    const token = core.getInput('token')
    if (!token) throw new Error('The token input is empty. Add a classic token as a secret.')

    const rawHours = core.getInput('since-hours')
    const sinceHours = Number(rawHours)
    if (!Number.isFinite(sinceHours) || sinceHours <= 0) {
        throw new Error(`since-hours must be a positive number, got "${rawHours}"`)
    }

    return {
        token,
        backfill: core.getBooleanInput('backfill'),
        sinceHours,
        includeOrgs: core.getBooleanInput('include-orgs'),
        exclude: core
            .getMultilineInput('exclude')
            .flatMap((line) => line.split(','))
            .map((pattern) => pattern.trim())
            .filter(Boolean),
        dryRun: core.getBooleanInput('dry-run'),
    }
}
