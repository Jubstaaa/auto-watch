import { describe, expect, it } from 'vitest'

import type { Settings } from '../src/inputs.types'

import { runAutoWatch } from '../src/run'
import { FakeApi } from './fake-api'

const NOW = new Date('2026-10-12T12:00:00Z')
const ENV = {
    repository: 'me/me',
    workflowRef: 'me/me/.github/workflows/auto-watch.yml@refs/heads/main',
}

const settings = (extra: Partial<Settings> = {}): Settings => ({
    backfill: false,
    dryRun: false,
    exclude: [],
    includeOrgs: true,
    sinceHours: 24,
    token: 't',
    workflowToken: 'job',
    ...extra,
})

describe('runAutoWatch', () => {
    it('watches new repos and keeps the schedule alive', async () => {
        const api = new FakeApi()
        api.repos = [
            {
                archived: false,
                createdAt: '2026-10-12T10:00:00Z',
                fork: false,
                fullName: 'me/new',
                private: false,
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
                archived: false,
                createdAt: '2026-10-12T10:00:00Z',
                fork: false,
                fullName: 'me/secret',
                private: true,
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

    it('fails the run but keeps its warnings when the repos cannot be listed', async () => {
        const api = new FakeApi()
        api.failEnable = true
        api.ownedRepos = () => Promise.reject(new Error('Server Error'))

        const outcome = await runAutoWatch(api, settings(), ENV, NOW)

        expect(outcome.failure).toBe('Could not list your repos: Server Error')
        expect(outcome.watched).toEqual([])
        expect(outcome.warnings).toEqual([
            expect.stringContaining('actions: write'),
        ])
    })
})
