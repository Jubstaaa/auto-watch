import { throttling } from '@octokit/plugin-throttling'
import { RequestError } from '@octokit/request-error'
import { Octokit } from '@octokit/rest'

import type { Identity, Repo, Subscription } from './api.types'

export interface GitHubApi {
    adminOrgs(): Promise<string[]>
    enableWorkflow(fullName: string, workflowRef: string): Promise<void>
    identity(): Promise<Identity>
    orgRepos(org: string): Promise<Repo[]>
    ownedRepos(): Promise<Repo[]>
    subscription(fullName: string): Promise<Subscription>
    watch(fullName: string): Promise<void>
}

const Throttled = Octokit.plugin(throttling)

const silent = () => undefined
const logNothing = { debug: silent, error: silent, info: silent, warn: silent }

const client = (token: string) =>
    new Throttled({
        auth: token,
        log: logNothing,
        throttle: {
            onRateLimit: (_after, _options, _octokit, retryCount) =>
                retryCount < 2,
            onSecondaryRateLimit: (_after, _options, _octokit, retryCount) =>
                retryCount < 2,
        },
        userAgent: 'auto-watch',
    })

const toRepo = (repo: {
    archived?: boolean
    created_at?: null | string
    fork: boolean
    full_name: string
    private: boolean
}): Repo => ({
    archived: repo.archived ?? false,
    createdAt: repo.created_at ?? new Date(0).toISOString(),
    fork: repo.fork,
    fullName: repo.full_name,
    private: repo.private,
})

const split = (fullName: string) => {
    const [owner = '', repo = ''] = fullName.split('/')
    return { owner, repo }
}

export const createApi = (token: string, workflowToken: string): GitHubApi => {
    const user = client(token)
    const job = client(workflowToken)

    return {
        async adminOrgs() {
            const memberships = await user.paginate(
                user.rest.orgs.listMembershipsForAuthenticatedUser,
                { per_page: 100, state: 'active' }
            )
            return memberships
                .filter(m => m.role === 'admin')
                .map(m => m.organization.login)
        },
        async enableWorkflow(fullName: string, workflowRef: string) {
            await job.rest.actions.enableWorkflow({
                ...split(fullName),
                workflow_id: workflowRef,
            })
        },
        async identity(): Promise<Identity> {
            const response = await user.rest.users.getAuthenticated()
            const header = response.headers['x-oauth-scopes']
            return {
                login: response.data.login,
                scopes:
                    header === undefined
                        ? null
                        : header
                              .split(',')
                              .map(scope => scope.trim())
                              .filter(Boolean),
            }
        },
        async orgRepos(org: string) {
            const repos = await user.paginate(user.rest.repos.listForOrg, {
                org,
                per_page: 100,
            })
            return repos.map(toRepo)
        },
        async ownedRepos() {
            const repos = await user.paginate(
                user.rest.repos.listForAuthenticatedUser,
                {
                    affiliation: 'owner',
                    per_page: 100,
                }
            )
            return repos.map(toRepo)
        },
        async subscription(fullName: string): Promise<Subscription> {
            try {
                const { data } = await user.rest.activity.getRepoSubscription(
                    split(fullName)
                )
                if (data.ignored) return 'ignored'
                return data.subscribed ? 'watching' : 'none'
            } catch (error) {
                if (error instanceof RequestError && error.status === 404)
                    return 'none'
                throw error
            }
        },
        async watch(fullName: string) {
            await user.rest.activity.setRepoSubscription({
                ...split(fullName),
                ignored: false,
                subscribed: true,
            })
        },
    }
}
