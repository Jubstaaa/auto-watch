import type { GitHubApi } from './api'
import type { Repo } from './api.types'
import type { Settings } from './inputs.types'

export interface Candidates {
    repos: Repo[]
    excluded: number
    warnings: string[]
}

const HOUR = 60 * 60 * 1000

export const matchesPattern = (fullName: string, pattern: string): boolean => {
    const escaped = pattern
        .toLowerCase()
        .split('*')
        .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
        .join('.*')
    return new RegExp(`^${escaped}$`).test(fullName.toLowerCase())
}

export const isRecent = (createdAt: string, sinceHours: number, now: Date): boolean =>
    now.getTime() - new Date(createdAt).getTime() <= sinceHours * HOUR

const orgReposOf = async (api: GitHubApi, warnings: string[]): Promise<Repo[]> => {
    try {
        const orgs = await api.adminOrgs()
        const lists = await Promise.all(orgs.map((org) => api.orgRepos(org)))
        return lists.flat()
    } catch (error) {
        warnings.push(
            `Skipped organization repos: ${(error as Error).message}. Add the read:org scope to cover them.`
        )
        return []
    }
}

export const collectCandidates = async (
    api: GitHubApi,
    settings: Settings,
    now: Date
): Promise<Candidates> => {
    const warnings: string[] = []
    const owned = await api.ownedRepos()
    const fromOrgs = settings.includeOrgs ? await orgReposOf(api, warnings) : []

    const unique = new Map<string, Repo>()
    for (const repo of [...owned, ...fromOrgs]) {
        const key = repo.fullName.toLowerCase()
        if (!unique.has(key)) unique.set(key, repo)
    }

    let excluded = 0
    const repos = [...unique.values()].filter((repo) => {
        if (repo.fork || repo.archived) return false
        if (!settings.backfill && !isRecent(repo.createdAt, settings.sinceHours, now)) return false
        if (settings.exclude.some((pattern) => matchesPattern(repo.fullName, pattern))) {
            excluded += 1
            return false
        }
        return true
    })

    return { repos, excluded, warnings }
}
