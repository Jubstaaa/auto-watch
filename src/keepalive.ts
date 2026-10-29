import { basename } from 'node:path'

import type { GitHubApi } from './api'

export const workflowFileOf = (workflowRef: string): string =>
    basename(workflowRef.replace(/@.*$/, ''))

export const keepAlive = async (
    api: GitHubApi,
    fullName: string,
    workflowRef: string
): Promise<string | null> => {
    try {
        await api.enableWorkflow(fullName, workflowRef)
        return null
    } catch (error) {
        return `Could not keep the schedule alive (${(error as Error).message}). Add "permissions: actions: write" to the workflow, or GitHub will pause it after 60 days without commits.`
    }
}
