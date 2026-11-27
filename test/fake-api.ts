import type { GitHubApi } from '../src/api'
import type { Identity, Repo, Subscription } from '../src/api.types'

export class FakeApi implements GitHubApi {
    enabled: string[] = []
    failEnable = false
    failOrgRepos = new Set<string>()
    failOrgs = false
    failWatch = new Set<string>()
    identityValue: Identity = {
        login: 'me',
        scopes: ['notifications', 'read:org'],
    }
    orgs: Record<string, Repo[]> = {}
    repos: Repo[] = []
    subscriptions: Record<string, Subscription> = {}
    watched: string[] = []

    async adminOrgs() {
        if (this.failOrgs)
            throw new Error('Resource not accessible: read:org missing')
        return Object.keys(this.orgs)
    }

    async enableWorkflow(fullName: string, workflowRef: string) {
        if (this.failEnable)
            throw new Error('Resource not accessible by integration')
        this.enabled.push(`${fullName}:${workflowRef}`)
    }

    async identity() {
        return this.identityValue
    }

    async orgRepos(org: string) {
        if (this.failOrgRepos.has(org))
            throw new Error(
                'Resource protected by organization SAML enforcement'
            )
        return this.orgs[org] ?? []
    }

    async ownedRepos() {
        return this.repos
    }

    async subscription(fullName: string) {
        return this.subscriptions[fullName] ?? 'none'
    }

    async watch(fullName: string) {
        if (this.failWatch.has(fullName))
            throw new Error(`cannot watch ${fullName}`)
        this.watched.push(fullName)
        this.subscriptions[fullName] = 'watching'
    }
}
