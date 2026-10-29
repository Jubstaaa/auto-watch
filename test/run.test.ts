import { describe, expect, it } from 'vitest'

import { FakeApi } from './fake-api'
import { runAutoWatch } from '../src/run'

import type { Settings } from '../src/inputs.types'

const NOW = new Date('2026-10-12T12:00:00Z')
const ENV = {
    repository: 'me/me',
    workflowRef: 'me/me/.github/workflows/auto-watch.yml@refs/heads/main',
}

const settings = (extra: Partial<Settings> = {}): Settings => ({
    token: 't',
    backfill: false,
    sinceHours: 24,
    includeOrgs: true,
    exclude: [],
    dryRun: false,
    ...extra,
})

describe('runAutoWatch', () => {
    it('watches new repos and keeps the schedule alive', async () => {
        const api = new FakeApi()
        api.repos = [
            {
                fullName: 'me/new',
                fork: false,
                private: false,
                archived: false,
                createdAt: '2026-10-12T10:00:00Z',
            },
        ]

        const outcome = await runAutoWatch(api, settings(), ENV, NOW)

        expect(api.watched).toEqual(['me/new'])
        expect(api.enabled).toEqual(['me/me:auto-watch.yml'])
        expect(outcome.failure).toBeNull()
        expect(outcome.watched).toEqual(['me/new'])
    })

    it('keeps private repo names out of the log and summary', async () => {
        const api = new FakeApi()
        api.repos = [
            {
                fullName: 'me/secret',
                fork: false,
                private: true,
                archived: false,
                createdAt: '2026-10-12T10:00:00Z',
            },
        ]

        const outcome = await runAutoWatch(api, settings(), ENV, NOW)

        expect(api.watched).toEqual(['me/secret'])
        expect(outcome.log).toEqual(['Watching 1 private repo'])
        expect(outcome.report?.privateNames).toEqual(new Set(['me/secret']))
    })

    it('still keeps the schedule alive when the token is wrong', async () => {
        const api = new FakeApi()
        api.identityValue = { login: 'me', scopes: ['repo'] }

        const outcome = await runAutoWatch(api, settings(), ENV, NOW)

        expect(api.enabled).toEqual(['me/me:auto-watch.yml'])
        expect(outcome.failure).toContain('notifications')
        expect(api.watched).toEqual([])
    })

    it('leaves the workflow alone in a dry run', async () => {
        const api = new FakeApi()
        await runAutoWatch(api, settings({ dryRun: true }), ENV, NOW)
        expect(api.enabled).toEqual([])
    })
})
