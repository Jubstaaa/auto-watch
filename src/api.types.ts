export interface Identity {
    login: string
    scopes: null | string[]
}

export interface Repo {
    archived: boolean
    createdAt: string
    fork: boolean
    fullName: string
    private: boolean
}

export type Subscription = 'ignored' | 'none' | 'watching'
