import { describe, expect, it } from 'vitest'

import { renderSummary, runFailed } from '../src/summary'

import type { WatchResult } from '../src/watch'

const result = (extra: Partial<WatchResult> = {}): WatchResult => ({
    watched: [],
    alreadyWatching: [],
    ignored: [],
    failed: [],
    ...extra,
})

describe('renderSummary', () => {
    it('lists what was watched and the counts', () => {
        const text = renderSummary(
            result({ watched: ['me/a'], alreadyWatching: ['me/b'], ignored: ['me/c'] }),
            { repos: [], excluded: 2, warnings: ['Skipped organization repos'] },
            false
        )
        expect(text).toContain('Watched 1 repo')
        expect(text).toContain('`me/a`')
        expect(text).toContain('| Already watching | 1 |')
        expect(text).toContain('| Ignored by you | 1 |')
        expect(text).toContain('| Excluded | 2 |')
        expect(text).toContain('Skipped organization repos')
    })

    it('says nothing changed in a dry run', () => {
        const text = renderSummary(
            result({ watched: ['me/a'] }),
            { repos: [], excluded: 0, warnings: [] },
            true
        )
        expect(text).toContain('Dry run: would watch 1 repo')
    })
})

describe('runFailed', () => {
    it('fails only when every attempt failed', () => {
        expect(runFailed(result())).toBe(false)
        expect(runFailed(result({ failed: [{ fullName: 'a/b', reason: 'x' }] }))).toBe(true)
        expect(
            runFailed(result({ watched: ['a/c'], failed: [{ fullName: 'a/b', reason: 'x' }] }))
        ).toBe(false)
    })
})
