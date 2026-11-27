import picomatch from 'picomatch'

import type { GitHubApi } from './api'
import type { Repo } from './api.types'
import type { Settings } from './inputs.types'

import { errorMessage } from './error-message'

export interface Candidates {
    excluded: number
    repos: Repo[]
    warnings: string[]
}

const HOUR = 60 * 60 * 1000

export const isRecent = (
    createdAt: string,
    sinceHours: number,
    now: Date
): boolean => now.getTime() - new Date(createdAt).getTime() <= sinceHours * HOUR

const orgReposOf = async (
    api: GitHubApi,
    warnings: string[]
): Promise<Repo[]> => {
    let orgs: string[]
    try {
        orgs = await api.adminOrgs()
    } catch (error) {
        warnings.push(
            `Skipped organization repos: ${errorMessage(error)}. Add the read:org scope to cover them.`
        )
        return []
    }

    const lists = await Promise.all(
        orgs.map(async org => {
            try {
                return await api.orgRepos(org)
            } catch (error) {
                warnings.push(
                    `Skipped ${org}: ${errorMessage(error)}. If the org uses SAML SSO, authorize the token for it.`
                )
                return []
            }
        })
    )
    return lists.flat()
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

    const isExcluded = picomatch(settings.exclude, { nocase: true })
    let excluded = 0
    const repos = [...unique.values()].filter(repo => {
        if (repo.fork || repo.archived) return false
        if (
            !settings.backfill &&
            !isRecent(repo.createdAt, settings.sinceHours, now)
        )
            return false
        if (isExcluded(repo.fullName)) {
            excluded += 1
            return false
        }
        return true
    })

    return { excluded, repos, warnings }
}
