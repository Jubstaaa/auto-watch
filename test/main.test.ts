import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import * as core from '@actions/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { run } from '../src/main'
import { fakeGitHub } from './fake-github'

// core.summary remembers the first GITHUB_STEP_SUMMARY path it sees, so every
// test shares one pair of files and empties them first.
const dir = mkdtempSync(join(tmpdir(), 'auto-watch-'))
const outputFile = join(dir, 'output')
const summaryFile = join(dir, 'summary')

// GITHUB_OUTPUT holds heredoc entries: name<<delimiter, value, delimiter.
const outputs = (): Record<string, string> =>
    Object.fromEntries(
        [...readFileSync(outputFile, 'utf8').matchAll(/^(.+)<<(.+)\n([\s\S]*?)\n\2$/gm)].map(
            ([, name = '', , value = '']) => [name, value]
        )
    )

beforeEach(() => {
    writeFileSync(outputFile, '')
    writeFileSync(summaryFile, '')
    vi.stubEnv('GITHUB_OUTPUT', outputFile)
    vi.stubEnv('GITHUB_STEP_SUMMARY', summaryFile)
    vi.stubEnv('GITHUB_REPOSITORY', 'me/me')
    vi.stubEnv('GITHUB_WORKFLOW_REF', 'me/me/.github/workflows/auto-watch.yml@refs/heads/main')
    for (const [name, value] of Object.entries({
        token: 'pat',
        backfill: 'true',
        'since-hours': '24',
        'include-orgs': 'false',
        exclude: '',
        'dry-run': 'false',
        'github-token': 'job',
    })) {
        vi.stubEnv(`INPUT_${name.toUpperCase()}`, value)
    }
    vi.spyOn(process.stdout, 'write').mockReturnValue(true)
})

afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    core.summary.emptyBuffer()
    process.exitCode = undefined
})

const scopes = (value: string) => ({
    'GET /user': { status: 200, body: { login: 'me' }, headers: { 'x-oauth-scopes': value } },
    'PUT /repos/me/me/actions/workflows/auto-watch.yml/enable': { status: 204 },
})

describe('run', () => {
    it('sets the watched count and the JSON list of repos', async () => {
        fakeGitHub({
            ...scopes('notifications'),
            'GET /user/repos': {
                status: 200,
                body: [
                    {
                        full_name: 'me/new',
                        fork: false,
                        private: false,
                        created_at: '2026-10-12T10:00:00Z',
                    },
                ],
            },
            'PUT /repos/me/new/subscription': { status: 200, body: {} },
        })

        await run()

        expect(outputs()).toEqual({ watched: '1', 'watched-repos': '["me/new"]' })
        expect(readFileSync(summaryFile, 'utf8')).toContain('Watched 1 repo')
        expect(process.exitCode).toBeUndefined()
    })

    it('fails the step when the token cannot watch, with empty outputs', async () => {
        fakeGitHub(scopes('repo'))

        await run()

        expect(outputs()).toEqual({ watched: '0', 'watched-repos': '[]' })
        expect(readFileSync(summaryFile, 'utf8')).toContain('notifications scope')
        expect(process.exitCode).toBe(core.ExitCode.Failure)
    })

    it('fails the step on a bad input instead of throwing', async () => {
        vi.stubEnv('INPUT_SINCE-HOURS', 'soon')

        await expect(run()).resolves.toBeUndefined()

        expect(process.exitCode).toBe(core.ExitCode.Failure)
    })
})
