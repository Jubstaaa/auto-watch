import { vi } from 'vitest'

export interface Call {
    method: string
    path: string
    auth: string | null
    body: unknown
}

interface Reply {
    status: number
    body?: unknown
    headers?: Record<string, string>
}
type Route = (call: Call) => Reply | undefined

const json = ({ status, body, headers = {} }: Reply) =>
    new Response(status === 204 || body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json', ...headers },
    })

// Stands in for api.github.com at the fetch level, so the real Octokit
// clients (pagination, error mapping, headers) run unchanged.
export const fakeGitHub = (routes: Record<string, Route | Reply>) => {
    const calls: Call[] = []

    vi.stubGlobal('fetch', (input: string | URL | Request, init: RequestInit = {}) => {
        const url = new URL(input instanceof Request ? input.url : input)
        const headers = new Headers(init.headers)
        const call: Call = {
            method: init.method ?? 'GET',
            path: url.pathname,
            auth: headers.get('authorization'),
            body: typeof init.body === 'string' && init.body ? JSON.parse(init.body) : undefined,
        }
        calls.push(call)

        const route = routes[`${call.method} ${call.path}`]
        const reply = typeof route === 'function' ? route(call) : route
        return Promise.resolve(json(reply ?? { status: 404, body: { message: 'Not Found' } }))
    })

    return calls
}
