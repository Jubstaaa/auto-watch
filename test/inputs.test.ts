import { afterEach, describe, expect, it, vi } from 'vitest'

import { parseInputs } from '../src/inputs'

const DEFAULTS = {
    token: 't',
    backfill: 'false',
    'since-hours': '24',
    'include-orgs': 'true',
    exclude: '',
    'dry-run': 'false',
    'github-token': 'job',
}

const withInputs = (values: Record<string, string>) => {
    for (const [name, value] of Object.entries({ ...DEFAULTS, ...values })) {
        vi.stubEnv(`INPUT_${name.toUpperCase()}`, value)
    }
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
})

describe('parseInputs', () => {
    it('applies the defaults', () => {
        withInputs({})
        expect(parseInputs()).toEqual({
            token: 't',
            backfill: false,
            sinceHours: 24,
            includeOrgs: true,
            exclude: [],
            dryRun: false,
            workflowToken: 'job',
        })
    })

    it('reads booleans the way Actions writes them', () => {
        withInputs({ backfill: 'true', 'include-orgs': 'False', 'dry-run': 'TRUE' })
        expect(parseInputs()).toMatchObject({ backfill: true, includeOrgs: false, dryRun: true })
    })

    it('splits exclude on commas and newlines and drops blanks', () => {
        withInputs({ exclude: ' a/b ,\n\nMy-Org/* \n, ' })
        expect(parseInputs().exclude).toEqual(['a/b', 'My-Org/*'])
    })

    it('requires a token', () => {
        withInputs({ token: '' })
        expect(() => parseInputs()).toThrow('token')
    })

    it.each(['abc', '0', '-3'])('rejects since-hours %s', (value) => {
        withInputs({ 'since-hours': value })
        expect(() => parseInputs()).toThrow('since-hours must be a positive number')
    })

    it('masks both tokens in the log', () => {
        const write = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
        withInputs({ token: 'pat-value', 'github-token': 'job-value' })
        parseInputs()
        const log = write.mock.calls.map(([text]) => String(text)).join('')
        expect(log).toContain('::add-mask::pat-value')
        expect(log).toContain('::add-mask::job-value')
    })
})
