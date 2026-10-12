import type { Settings } from './inputs.types'

const flag = (value: string, fallback: boolean): boolean =>
    value.trim() === '' ? fallback : value.trim().toLowerCase() === 'true'

export const parseInputs = (read: (name: string) => string): Settings => {
    const token = read('token').trim()
    if (!token) throw new Error('The token input is empty. Add a classic token as a secret.')

    const rawHours = read('since-hours').trim() || '24'
    const sinceHours = Number(rawHours)
    if (!Number.isFinite(sinceHours) || sinceHours <= 0) {
        throw new Error(`since-hours must be a positive number, got "${rawHours}"`)
    }

    const exclude = read('exclude')
        .split(/[,\n]/)
        .map((pattern) => pattern.trim().toLowerCase())
        .filter(Boolean)

    return {
        token,
        backfill: flag(read('backfill'), false),
        sinceHours,
        includeOrgs: flag(read('include-orgs'), true),
        exclude,
        dryRun: flag(read('dry-run'), false),
    }
}
