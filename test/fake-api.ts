import type { GitHubApi } from '../src/api'
import type { Identity, Repo, Subscription } from '../src/api.types'

export class FakeApi implements GitHubApi {
    identityValue: Identity = { login: 'me', scopes: ['notifications', 'read:org'] }
    repos: Repo[] = []
    orgs: Record<string, Repo[]> = {}
    subscriptions: Record<string, Subscription> = {}
    watched: string[] = []
    enabled: string[] = []
    failWatch = new Set<string>()
    failOrgs = false
    failOrgRepos = new Set<string>()
    failEnable = false

    async identity() {
        return this.identityValue
    }

    async ownedRepos() {
        return this.repos
    }

    async adminOrgs() {
        if (this.failOrgs) throw new Error('Resource not accessible: read:org missing')
        return Object.keys(this.orgs)
    }

    async orgRepos(org: string) {
        if (this.failOrgRepos.has(org))
            throw new Error('Resource protected by organization SAML enforcement')
        return this.orgs[org] ?? []
    }

    async subscription(fullName: string) {
        return this.subscriptions[fullName] ?? 'none'
    }

    async watch(fullName: string) {
        if (this.failWatch.has(fullName)) throw new Error(`cannot watch ${fullName}`)
        this.watched.push(fullName)
        this.subscriptions[fullName] = 'watching'
    }

    async enableWorkflow(fullName: string, workflowRef: string) {
        if (this.failEnable) throw new Error('Resource not accessible by integration')
        this.enabled.push(`${fullName}:${workflowRef}`)
    }
}
