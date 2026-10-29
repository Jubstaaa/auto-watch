import { describe, expect, it } from 'vitest'

import { collectCandidates, isRecent } from '../src/candidates'
import { FakeApi } from './fake-api'

import type { Repo } from '../src/api.types'
import type { Settings } from '../src/inputs.types'

const NOW = new Date('2026-10-12T12:00:00Z')

const repo = (fullName: string, extra: Partial<Repo> = {}): Repo => ({
    fullName,
    fork: false,
    private: false,
    archived: false,
    createdAt: '2026-10-12T10:00:00Z',
    ...extra,
})

const settings = (extra: Partial<Settings> = {}): Settings => ({
    token: 't',
    backfill: false,
    sinceHours: 24,
    includeOrgs: true,
    exclude: [],
    dryRun: false,
    ...extra,
})

const names = (repos: Repo[]) => repos.map((r) => r.fullName)

describe('isRecent', () => {
    it('keeps repos inside the window and drops older ones', () => {
        expect(isRecent('2026-10-11T13:00:00Z', 24, NOW)).toBe(true)
        expect(isRecent('2026-10-11T11:00:00Z', 24, NOW)).toBe(false)
    })
})

describe('collectCandidates', () => {
    it('drops forks, archived repos and old repos unless backfilling', async () => {
        const api = new FakeApi()
        api.repos = [
            repo('me/new'),
            repo('me/fork', { fork: true }),
            repo('me/archived', { archived: true }),
            repo('me/old', { createdAt: '2025-06-01T00:00:00Z' }),
        ]

        expect(names((await collectCandidates(api, settings(), NOW)).repos)).toEqual(['me/new'])
        expect(
            names((await collectCandidates(api, settings({ backfill: true }), NOW)).repos)
        ).toEqual(['me/new', 'me/old'])
    })

    it('includes admin org repos unless include-orgs is off', async () => {
        const api = new FakeApi()
        api.repos = [repo('me/a')]
        api.orgs = { acme: [repo('acme/api')] }

        expect(names((await collectCandidates(api, settings(), NOW)).repos)).toEqual([
            'me/a',
            'acme/api',
        ])
        expect(
            names((await collectCandidates(api, settings({ includeOrgs: false }), NOW)).repos)
        ).toEqual(['me/a'])
    })

    it('counts excluded repos and skips them', async () => {
        const api = new FakeApi()
        api.repos = [repo('me/a'), repo('me/app2'), repo('me/Scratch-1')]
        api.orgs = { acme: [repo('acme/api')] }

        const result = await collectCandidates(
            api,
            settings({ exclude: ['*/scratch-*', 'ACME/*', 'me/app'] }),
            NOW
        )
        expect(names(result.repos)).toEqual(['me/a', 'me/app2'])
        expect(result.excluded).toBe(2)
    })

    it('lists a repo once even if the API returns it twice', async () => {
        const api = new FakeApi()
        api.repos = [repo('me/a'), repo('Me/A')]
        expect((await collectCandidates(api, settings(), NOW)).repos).toHaveLength(1)
    })

    it('keeps going with personal repos when the org lookup fails', async () => {
        const api = new FakeApi()
        api.repos = [repo('me/a')]
        api.failOrgs = true

        const result = await collectCandidates(api, settings(), NOW)
        expect(names(result.repos)).toEqual(['me/a'])
        expect(result.warnings[0]).toContain('read:org')
    })

    it('keeps the other orgs when one org fails, and names the one that did', async () => {
        const api = new FakeApi()
        api.orgs = { acme: [repo('acme/api')], sso: [repo('sso/app')] }
        api.failOrgRepos.add('sso')

        const result = await collectCandidates(api, settings(), NOW)
        expect(names(result.repos)).toEqual(['acme/api'])
        expect(result.warnings).toHaveLength(1)
        expect(result.warnings[0]).toContain('sso')
        expect(result.warnings[0]).not.toContain('read:org')
    })
})
