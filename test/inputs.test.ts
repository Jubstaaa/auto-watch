import { describe, expect, it } from 'vitest'

import { parseInputs } from '../src/inputs'

const reader = (values: Record<string, string>) => (name: string) => values[name] ?? ''

describe('parseInputs', () => {
    it('applies the defaults', () => {
        expect(parseInputs(reader({ token: 't' }))).toEqual({
            token: 't',
            backfill: false,
            sinceHours: 24,
            includeOrgs: true,
            exclude: [],
            dryRun: false,
        })
    })

    it('reads booleans the way Actions writes them', () => {
        const settings = parseInputs(
            reader({ token: 't', backfill: 'true', 'include-orgs': 'False', 'dry-run': 'TRUE' })
        )
        expect(settings).toMatchObject({ backfill: true, includeOrgs: false, dryRun: true })
    })

    it('splits exclude on commas and newlines and drops blanks', () => {
        const settings = parseInputs(reader({ token: 't', exclude: ' a/b ,\n\nMy-Org/* \n, ' }))
        expect(settings.exclude).toEqual(['a/b', 'my-org/*'])
    })

    it('requires a token', () => {
        expect(() => parseInputs(reader({}))).toThrow('token')
    })

    it.each(['abc', '0', '-3'])('rejects since-hours %s', (value) => {
        expect(() => parseInputs(reader({ token: 't', 'since-hours': value }))).toThrow(
            'since-hours must be a positive number'
        )
    })
})
