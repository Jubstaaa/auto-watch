import type { Identity } from './api.types'

export const TOKEN_LINK =
    'https://github.com/settings/tokens/new?scopes=notifications,read:org&description=auto-watch'

export class TokenError extends Error {}

export const checkToken = (identity: Identity): void => {
    if (identity.scopes === null) {
        throw new TokenError(
            `This looks like a fine-grained or app token. GitHub only lets a classic token watch repos. Create one here: ${TOKEN_LINK}`
        )
    }
    if (!identity.scopes.includes('notifications')) {
        throw new TokenError(
            `This token can't watch repos: it lacks the notifications scope. Create a classic token here: ${TOKEN_LINK}`
        )
    }
}
