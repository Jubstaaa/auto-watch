import * as core from '@actions/core'
import { afterEach, describe, expect, it } from 'vitest'

import type { Report } from '../src/summary'
import type { WatchResult } from '../src/watch'

import { renderSummary, runFailed } from '../src/summary'

const result = (extra: Partial<WatchResult> = {}): WatchResult => ({
    alreadyWatching: [],
    failed: [],
    ignored: [],
    watched: [],
    ...extra,
})

const render = (extra: Partial<Report>) =>
    renderSummary(core.summary, {
        candidates: { excluded: 0, repos: [], warnings: [] },
        dryRun: false,
        privateNames: new Set(),
        result: result(),
        ...extra,
    }).stringify()

afterEach(() => {
    core.summary.emptyBuffer()
})

describe('renderSummary', () => {
    it('lists what was watched and the counts', () => {
        const text = render({
            candidates: {
                excluded: 2,
                repos: [],
                warnings: ['Skipped organization repos'],
            },
            result: result({
                alreadyWatching: ['me/b'],
                ignored: ['me/c'],
                watched: ['me/a'],
            }),
        })
        expect(text).toContain('Watched 1 repo')
        expect(text).toContain('<code>me/a</code>')
        expect(text).toContain('<td>Already watching</td><td>1</td>')
        expect(text).toContain('<td>Ignored by you</td><td>1</td>')
        expect(text).toContain('<td>Excluded</td><td>2</td>')
        expect(text).toContain('Skipped organization repos')
    })

    it('says nothing changed in a dry run', () => {
        expect(
            render({ dryRun: true, result: result({ watched: ['me/a'] }) })
        ).toContain('Dry run: would watch 1 repo')
    })

    it('counts private repos without naming them', () => {
        const text = render({
            privateNames: new Set(['me/broken', 'me/hidden', 'me/secret']),
            result: result({
                failed: [{ fullName: 'me/broken', reason: 'Not Found' }],
                watched: ['me/public', 'me/secret', 'me/hidden'],
            }),
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
        expect(
            runFailed(result({ failed: [{ fullName: 'a/b', reason: 'x' }] }))
        ).toBe(true)
        expect(
            runFailed(
                result({
                    failed: [{ fullName: 'a/b', reason: 'x' }],
                    watched: ['a/c'],
                })
            )
        ).toBe(false)
    })
})
