import { expect, it, vi } from 'vitest'

import { createApi } from '../src/api'
import { fakeGitHub } from './fake-github'

const printed = vi.hoisted(() => {
    const lines: string[] = []
    for (const level of ['debug', 'error', 'info', 'log', 'warn'] as const) {
        console[level] = (...args: unknown[]) => {
            lines.push(args.map(String).join(' '))
        }
    }
    return lines
})

it('never names a repo in console output, since private names would land in a public log', async () => {
    fakeGitHub({
        'GET /repos/me/secret-b/subscription': {
            body: { message: 'Forbidden' },
            status: 403,
        },
    })
    const api = createApi('pat', 'job')

    expect(await api.subscription('me/secret-a')).toBe('none')
    await expect(api.subscription('me/secret-b')).rejects.toThrow('Forbidden')
    await expect(api.watch('me/secret-c')).rejects.toThrow('Not Found')

    expect(printed.join('\n')).not.toMatch(/secret/)
})
