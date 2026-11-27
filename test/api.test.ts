import { afterEach, describe, expect, it, vi } from 'vitest'

import { createApi } from '../src/api'
import { fakeGitHub } from './fake-github'

const repo = (full_name: string, extra: Record<string, unknown> = {}) => ({
    archived: false,
    created_at: '2026-10-12T10:00:00Z',
    fork: false,
    full_name,
    private: false,
    ...extra,
})

afterEach(() => vi.unstubAllGlobals())

describe('createApi', () => {
    describe('identity', () => {
        it('reads the scopes of a classic token from x-oauth-scopes', async () => {
            fakeGitHub({
                'GET /user': {
                    body: { login: 'me' },
                    headers: {
                        'x-oauth-scopes': 'notifications, read:org,repo',
                    },
                    status: 200,
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
                    body: { login: 'me' },
                    headers: { 'x-oauth-scopes': '' },
                    status: 200,
                },
            })
            expect((await createApi('pat', 'job').identity()).scopes).toEqual(
                []
            )
        })

        it('reports null scopes for fine-grained and app tokens, which send no header', async () => {
            fakeGitHub({ 'GET /user': { body: { login: 'me' }, status: 200 } })
            expect((await createApi('pat', 'job').identity()).scopes).toBeNull()
        })
    })

    it('lists owned repos and fills in missing fields', async () => {
        fakeGitHub({
            'GET /user/repos': {
                body: [
                    repo('me/a', { private: true }),
                    { fork: true, full_name: 'me/b', private: false },
                ],
                status: 200,
            },
        })
        expect(await createApi('pat', 'job').ownedRepos()).toEqual([
            {
                archived: false,
                createdAt: '2026-10-12T10:00:00Z',
                fork: false,
                fullName: 'me/a',
                private: true,
            },
            {
                archived: false,
                createdAt: '1970-01-01T00:00:00.000Z',
                fork: true,
                fullName: 'me/b',
                private: false,
            },
        ])
    })

    it('keeps only the orgs where the user is an admin', async () => {
        fakeGitHub({
            'GET /user/memberships/orgs': {
                body: [
                    { organization: { login: 'acme' }, role: 'admin' },
                    { organization: { login: 'other' }, role: 'member' },
                ],
                status: 200,
            },
        })
        expect(await createApi('pat', 'job').adminOrgs()).toEqual(['acme'])
    })

    it('lists an org’s repos', async () => {
        fakeGitHub({
            'GET /orgs/acme/repos': { body: [repo('acme/api')], status: 200 },
        })
        const repos = await createApi('pat', 'job').orgRepos('acme')
        expect(repos.map(r => r.fullName)).toEqual(['acme/api'])
    })

    describe('subscription', () => {
        it('treats 404 as not watching', async () => {
            fakeGitHub({})
            expect(await createApi('pat', 'job').subscription('me/a')).toBe(
                'none'
            )
        })

        it('tells watching and ignored apart', async () => {
            fakeGitHub({
                'GET /repos/me/on/subscription': {
                    body: { ignored: false, subscribed: true },
                    status: 200,
                },
                'GET /repos/me/quiet/subscription': {
                    body: { ignored: true, subscribed: false },
                    status: 200,
                },
            })
            const api = createApi('pat', 'job')
            expect(await api.subscription('me/on')).toBe('watching')
            expect(await api.subscription('me/quiet')).toBe('ignored')
        })

        it('passes other errors on', async () => {
            fakeGitHub({
                'GET /repos/me/a/subscription': {
                    body: { message: 'Forbidden' },
                    status: 403,
                },
            })
            await expect(
                createApi('pat', 'job').subscription('me/a')
            ).rejects.toThrow('Forbidden')
        })
    })

    it('watches with the user token and re-enables the workflow with the job token', async () => {
        const calls = fakeGitHub({
            'PUT /repos/me/a/subscription': { body: {}, status: 200 },
            'PUT /repos/me/me/actions/workflows/auto-watch.yml/enable': {
                status: 204,
            },
        })
        const api = createApi('pat', 'job')

        await api.watch('me/a')
        await api.enableWorkflow('me/me', 'auto-watch.yml')

        expect(calls).toEqual([
            {
                auth: 'token pat',
                body: { ignored: false, subscribed: true },
                method: 'PUT',
                path: '/repos/me/a/subscription',
            },
            {
                auth: 'token job',
                body: undefined,
                method: 'PUT',
                path: '/repos/me/me/actions/workflows/auto-watch.yml/enable',
            },
        ])
    })
})
