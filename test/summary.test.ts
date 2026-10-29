import * as core from '@actions/core'
import { afterEach, describe, expect, it } from 'vitest'

import { renderSummary, runFailed } from '../src/summary'

import type { Report } from '../src/summary'
import type { WatchResult } from '../src/watch'

const result = (extra: Partial<WatchResult> = {}): WatchResult => ({
    watched: [],
    alreadyWatching: [],
    ignored: [],
    failed: [],
    ...extra,
})

const render = (extra: Partial<Report>) =>
    renderSummary(core.summary, {
        result: result(),
        candidates: { repos: [], excluded: 0, warnings: [] },
        privateNames: new Set(),
        dryRun: false,
        ...extra,
    }).stringify()

afterEach(() => {
    core.summary.emptyBuffer()
})

describe('renderSummary', () => {
    it('lists what was watched and the counts', () => {
        const text = render({
            result: result({ watched: ['me/a'], alreadyWatching: ['me/b'], ignored: ['me/c'] }),
            candidates: { repos: [], excluded: 2, warnings: ['Skipped organization repos'] },
        })
        expect(text).toContain('Watched 1 repo')
        expect(text).toContain('<code>me/a</code>')
        expect(text).toContain('<td>Already watching</td><td>1</td>')
        expect(text).toContain('<td>Ignored by you</td><td>1</td>')
        expect(text).toContain('<td>Excluded</td><td>2</td>')
        expect(text).toContain('Skipped organization repos')
    })

    it('says nothing changed in a dry run', () => {
        expect(render({ result: result({ watched: ['me/a'] }), dryRun: true })).toContain(
            'Dry run: would watch 1 repo'
        )
    })

    it('counts private repos without naming them', () => {
        const text = render({
            result: result({
                watched: ['me/public', 'me/secret', 'me/hidden'],
                failed: [{ fullName: 'me/broken', reason: 'Not Found' }],
            }),
            privateNames: new Set(['me/secret', 'me/hidden', 'me/broken']),
        })
        expect(text).toContain('<code>me/public</code>')
        expect(text).toContain('2 private repos')
        expect(text).toContain('A private repo: Not Found')
        expect(text).not.toMatch(/secret|hidden|broken/)
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
