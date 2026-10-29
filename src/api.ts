import { throttling } from '@octokit/plugin-throttling'
import { Octokit } from '@octokit/rest'

import type { Identity, Repo, Subscription } from './api.types'

export interface GitHubApi {
    identity(): Promise<Identity>
    ownedRepos(): Promise<Repo[]>
    adminOrgs(): Promise<string[]>
    orgRepos(org: string): Promise<Repo[]>
    subscription(fullName: string): Promise<Subscription>
    watch(fullName: string): Promise<void>
    enableWorkflow(fullName: string, workflowRef: string): Promise<void>
}

const Throttled = Octokit.plugin(throttling)

const client = (token: string) =>
    new Throttled({
        auth: token,
        userAgent: 'auto-watch',
        throttle: {
            onRateLimit: (_after, _options, _octokit, retryCount) => retryCount < 2,
            onSecondaryRateLimit: (_after, _options, _octokit, retryCount) => retryCount < 2,
        },
    })

const toRepo = (repo: {
    full_name: string
    fork: boolean
    private: boolean
    archived?: boolean
    created_at?: string | null
}): Repo => ({
    fullName: repo.full_name,
    fork: repo.fork,
    private: repo.private,
    archived: repo.archived ?? false,
    createdAt: repo.created_at ?? new Date(0).toISOString(),
})

const split = (fullName: string) => {
    const [owner = '', repo = ''] = fullName.split('/')
    return { owner, repo }
}

const status = (error: unknown) => (error as { status?: number }).status

export const createApi = (token: string, workflowToken: string): GitHubApi => {
    const user = client(token)
    const job = client(workflowToken)

    return {
        async identity(): Promise<Identity> {
            const response = await user.rest.users.getAuthenticated()
            const header = response.headers['x-oauth-scopes']
            return {
                login: response.data.login,
                scopes:
                    header === undefined
                        ? null
                        : String(header)
                              .split(',')
                              .map((scope) => scope.trim())
                              .filter(Boolean),
            }
        },
        async ownedRepos() {
            const repos = await user.paginate(user.rest.repos.listForAuthenticatedUser, {
                affiliation: 'owner',
                per_page: 100,
            })
            return repos.map(toRepo)
        },
        async adminOrgs() {
            const memberships = await user.paginate(
                user.rest.orgs.listMembershipsForAuthenticatedUser,
                { state: 'active', per_page: 100 }
            )
            return memberships.filter((m) => m.role === 'admin').map((m) => m.organization.login)
        },
        async orgRepos(org: string) {
            const repos = await user.paginate(user.rest.repos.listForOrg, { org, per_page: 100 })
            return repos.map(toRepo)
        },
        async subscription(fullName: string): Promise<Subscription> {
            try {
                const { data } = await user.rest.activity.getRepoSubscription(split(fullName))
                if (data.ignored) return 'ignored'
                return data.subscribed ? 'watching' : 'none'
            } catch (error) {
                if (status(error) === 404) return 'none'
                throw error
            }
        },
        async watch(fullName: string) {
            await user.rest.activity.setRepoSubscription({
                ...split(fullName),
                subscribed: true,
                ignored: false,
            })
        },
        async enableWorkflow(fullName: string, workflowRef: string) {
            await job.rest.actions.enableWorkflow({ ...split(fullName), workflow_id: workflowRef })
        },
    }
}
