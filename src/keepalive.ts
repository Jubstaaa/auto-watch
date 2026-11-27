import { basename } from 'node:path'

import type { GitHubApi } from './api'

import { errorMessage } from './error-message'

export const workflowFileOf = (workflowRef: string): string =>
    basename(workflowRef.replace(/@.*$/, ''))

export const keepAlive = async (
    api: GitHubApi,
    fullName: string,
    workflowRef: string
): Promise<null | string> => {
    try {
        await api.enableWorkflow(fullName, workflowRef)
        return null
    } catch (error) {
        return `Could not keep the schedule alive (${errorMessage(error)}). Add "permissions: actions: write" to the workflow, or GitHub will pause it after 60 days without commits.`
    }
}
