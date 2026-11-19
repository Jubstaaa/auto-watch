import { afterEach, describe, expect, it, vi } from 'vitest'

import { createApi } from '../src/api'
import { fakeGitHub } from './fake-github'

const repo = (full_name: string, extra: Record<string, unknown> = {}) => ({
    full_name,
    fork: false,
    private: false,
    archived: false,
    created_at: '2026-10-12T10:00:00Z',
    ...extra,
})

afterEach(() => vi.unstubAllGlobals())

describe('createApi', () => {
    describe('identity', () => {
        it('reads the scopes of a classic token from x-oauth-scopes', async () => {
            fakeGitHub({
                'GET /user': {
                    status: 200,
                    body: { login: 'me' },
                    headers: { 'x-oauth-scopes': 'notifications, read:org,repo' },
                },
            })
            expect(await createApi('pat', 'job').identity()).toEqual({
                login: 'me',
                scopes: ['notifications', 'read:org', 'repo'],
            })
        })

        it('reports no scopes for a classic token without any', async () => {
            fakeGitHub({
                'GET /user': {
                    status: 200,
                    body: { login: 'me' },
                    headers: { 'x-oauth-scopes': '' },
                },
            })
            expect((await createApi('pat', 'job').identity()).scopes).toEqual([])
        })

        it('reports null scopes for fine-grained and app tokens, which send no header', async () => {
            fakeGitHub({ 'GET /user': { status: 200, body: { login: 'me' } } })
            expect((await createApi('pat', 'job').identity()).scopes).toBeNull()
        })
    })

    it('lists owned repos and fills in missing fields', async () => {
        fakeGitHub({
            'GET /user/repos': {
                status: 200,
                body: [
                    repo('me/a', { private: true }),
                    { full_name: 'me/b', fork: true, private: false },
                ],
            },
        })
        expect(await createApi('pat', 'job').ownedRepos()).toEqual([
            {
                fullName: 'me/a',
                fork: false,
                private: true,
                archived: false,
                createdAt: '2026-10-12T10:00:00Z',
            },
            {
                fullName: 'me/b',
                fork: true,
                private: false,
                archived: false,
                createdAt: '1970-01-01T00:00:00.000Z',
            },
        ])
    })

    it('keeps only the orgs where the user is an admin', async () => {
        fakeGitHub({
            'GET /user/memberships/orgs': {
                status: 200,
                body: [
                    { role: 'admin', organization: { login: 'acme' } },
                    { role: 'member', organization: { login: 'other' } },
                ],
            },
        })
        expect(await createApi('pat', 'job').adminOrgs()).toEqual(['acme'])
    })

    it('lists an org’s repos', async () => {
        fakeGitHub({ 'GET /orgs/acme/repos': { status: 200, body: [repo('acme/api')] } })
        const repos = await createApi('pat', 'job').orgRepos('acme')
        expect(repos.map((r) => r.fullName)).toEqual(['acme/api'])
    })

    describe('subscription', () => {
        it('treats 404 as not watching', async () => {
            fakeGitHub({})
            expect(await createApi('pat', 'job').subscription('me/a')).toBe('none')
        })

        it('tells watching and ignored apart', async () => {
            fakeGitHub({
                'GET /repos/me/on/subscription': {
                    status: 200,
                    body: { subscribed: true, ignored: false },
                },
                'GET /repos/me/quiet/subscription': {
                    status: 200,
                    body: { subscribed: false, ignored: true },
                },
            })
            const api = createApi('pat', 'job')
            expect(await api.subscription('me/on')).toBe('watching')
            expect(await api.subscription('me/quiet')).toBe('ignored')
        })

        it('passes other errors on', async () => {
            fakeGitHub({
                'GET /repos/me/a/subscription': { status: 403, body: { message: 'Forbidden' } },
            })
            await expect(createApi('pat', 'job').subscription('me/a')).rejects.toThrow('Forbidden')
        })
    })

    it('watches with the user token and re-enables the workflow with the job token', async () => {
        const calls = fakeGitHub({
            'PUT /repos/me/a/subscription': { status: 200, body: {} },
            'PUT /repos/me/me/actions/workflows/auto-watch.yml/enable': { status: 204 },
        })
        const api = createApi('pat', 'job')

        await api.watch('me/a')
        await api.enableWorkflow('me/me', 'auto-watch.yml')

        expect(calls).toEqual([
            {
                method: 'PUT',
                path: '/repos/me/a/subscription',
                auth: 'token pat',
                body: { subscribed: true, ignored: false },
            },
            {
                method: 'PUT',
                path: '/repos/me/me/actions/workflows/auto-watch.yml/enable',
                auth: 'token job',
                body: undefined,
            },
        ])
    })
})
