export interface Settings {
    token: string
    backfill: boolean
    sinceHours: number
    includeOrgs: boolean
    exclude: string[]
    dryRun: boolean
}
