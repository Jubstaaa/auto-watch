import { describe, expect, it } from 'vitest'

import { FakeApi } from './fake-api'
import { keepAlive, workflowFileOf } from '../src/keepalive'

describe('keepAlive', () => {
    it('re-enables its own workflow', async () => {
        const api = new FakeApi()
        expect(await keepAlive(api, 'me/me', 'auto-watch.yml')).toBeNull()
        expect(api.enabled).toEqual(['me/me:auto-watch.yml'])
    })

    it('returns a warning instead of throwing', async () => {
        const api = new FakeApi()
        api.failEnable = true
        expect(await keepAlive(api, 'me/me', 'auto-watch.yml')).toContain('actions: write')
    })

    it('reads the file name out of GITHUB_WORKFLOW_REF', () => {
        expect(workflowFileOf('me/me/.github/workflows/auto-watch.yml@refs/heads/main')).toBe(
            'auto-watch.yml'
        )
    })
})
