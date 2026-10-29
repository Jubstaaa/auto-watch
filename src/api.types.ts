export interface Repo {
    fullName: string
    fork: boolean
    private: boolean
    archived: boolean
    createdAt: string
}

export type Subscription = 'none' | 'watching' | 'ignored'

export interface Identity {
    login: string
    scopes: string[] | null
}
