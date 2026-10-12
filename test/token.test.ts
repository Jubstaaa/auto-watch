import { describe, expect, it } from 'vitest'

import { TOKEN_LINK, TokenError, checkToken } from '../src/token'

describe('checkToken', () => {
    it('accepts a classic token with notifications', () => {
        expect(() => checkToken({ login: 'me', scopes: ['notifications', 'repo'] })).not.toThrow()
    })

    it('names the missing scope and links to a token page', () => {
        expect(() => checkToken({ login: 'me', scopes: ['repo'] })).toThrow(TokenError)
        expect(() => checkToken({ login: 'me', scopes: ['repo'] })).toThrow(TOKEN_LINK)
    })

    it('explains fine-grained and app tokens, which report no scopes at all', () => {
        expect(() => checkToken({ login: 'me', scopes: null })).toThrow('classic token')
    })
})
