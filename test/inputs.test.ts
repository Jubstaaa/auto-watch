import { afterEach, describe, expect, it, vi } from 'vitest'

import { parseInputs } from '../src/inputs'

const DEFAULTS = {
    'backfill': 'false',
    'dry-run': 'false',
    'exclude': '',
    'github-token': 'job',
    'include-orgs': 'true',
    'since-hours': '24',
    'token': 't',
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
            backfill: false,
            dryRun: false,
            exclude: [],
            includeOrgs: true,
            sinceHours: 24,
            token: 't',
            workflowToken: 'job',
        })
    })

    it('reads booleans the way Actions writes them', () => {
        withInputs({
            'backfill': 'true',
            'dry-run': 'TRUE',
            'include-orgs': 'False',
        })
        expect(parseInputs()).toMatchObject({
            backfill: true,
            dryRun: true,
            includeOrgs: false,
        })
    })

    it('splits exclude on commas and newlines and drops blanks', () => {
        withInputs({ exclude: ' a/b ,\n\nMy-Org/* \n, ' })
        expect(parseInputs().exclude).toEqual(['a/b', 'My-Org/*'])
    })

    it('requires a token', () => {
        withInputs({ token: '' })
        expect(() => parseInputs()).toThrow('token')
    })

    it.each(['abc', '0', '-3'])('rejects since-hours %s', value => {
        withInputs({ 'since-hours': value })
        expect(() => parseInputs()).toThrow(
            'since-hours must be a positive number'
        )
    })

    it('masks both tokens in the log', () => {
        const write = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
        withInputs({ 'github-token': 'job-value', 'token': 'pat-value' })
        parseInputs()
        const log = write.mock.calls.map(([text]) => String(text)).join('')
        expect(log).toContain('::add-mask::pat-value')
        expect(log).toContain('::add-mask::job-value')
    })
})
