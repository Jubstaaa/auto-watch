import { describe, expect, it } from 'vitest'

import { FakeApi } from './fake-api'
import { watchAll } from '../src/watch'

import type { Repo } from '../src/api.types'

const repo = (fullName: string): Repo => ({
    fullName,
    fork: false,
    private: false,
    archived: false,
    createdAt: '2026-10-12T10:00:00Z',
})

describe('watchAll', () => {
    it('watches unwatched repos and leaves watched and ignored ones alone', async () => {
        const api = new FakeApi()
        api.subscriptions = { 'me/on': 'watching', 'me/quiet': 'ignored' }

        const result = await watchAll(api, [repo('me/new'), repo('me/on'), repo('me/quiet')], false)

        expect(api.watched).toEqual(['me/new'])
        expect(result).toEqual({
            watched: ['me/new'],
            alreadyWatching: ['me/on'],
            ignored: ['me/quiet'],
            failed: [],
        })
    })

    it('changes nothing in a dry run but still reports what it would do', async () => {
        const api = new FakeApi()
        const result = await watchAll(api, [repo('me/new')], true)
        expect(api.watched).toEqual([])
        expect(result.watched).toEqual(['me/new'])
    })

    it('records a failure and carries on', async () => {
        const api = new FakeApi()
        api.failWatch.add('me/bad')
        const result = await watchAll(api, [repo('me/bad'), repo('me/good')], false)
        expect(result.watched).toEqual(['me/good'])
        expect(result.failed).toEqual([{ fullName: 'me/bad', reason: 'cannot watch me/bad' }])
    })
})
