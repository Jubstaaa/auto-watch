import { describe, expect, it } from 'vitest'

import type { Repo } from '../src/api.types'

import { watchAll } from '../src/watch'
import { FakeApi } from './fake-api'

const repo = (fullName: string): Repo => ({
    archived: false,
    createdAt: '2026-10-12T10:00:00Z',
    fork: false,
    fullName,
    private: false,
})

describe('watchAll', () => {
    it('watches unwatched repos and leaves watched and ignored ones alone', async () => {
        const api = new FakeApi()
        api.subscriptions = { 'me/on': 'watching', 'me/quiet': 'ignored' }

        const result = await watchAll(
            api,
            [repo('me/new'), repo('me/on'), repo('me/quiet')],
            false
        )

        expect(api.watched).toEqual(['me/new'])
        expect(result).toEqual({
            alreadyWatching: ['me/on'],
            failed: [],
            ignored: ['me/quiet'],
            watched: ['me/new'],
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
        const result = await watchAll(
            api,
            [repo('me/bad'), repo('me/good')],
            false
        )
        expect(result.watched).toEqual(['me/good'])
        expect(result.failed).toEqual([
            { fullName: 'me/bad', reason: 'cannot watch me/bad' },
        ])
    })

    it('reports something readable when the failure is not an Error', async () => {
        const api = new FakeApi()
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the case under test
        api.watch = () => Promise.reject('rate limited')
        const result = await watchAll(api, [repo('me/a')], false)
        expect(result.failed).toEqual([
            { fullName: 'me/a', reason: 'rate limited' },
        ])
    })
})
