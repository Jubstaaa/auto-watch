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
