import { vi } from 'vitest'

export interface Call {
    auth: null | string
    body: unknown
    method: string
    path: string
}

interface Reply {
    body?: unknown
    headers?: Record<string, string>
    status: number
}
type Route = (call: Call) => Reply | undefined

const json = ({ body, headers = {}, status }: Reply) =>
    new Response(
        status === 204 || body === undefined ? null : JSON.stringify(body),
        {
            headers: { 'content-type': 'application/json', ...headers },
            status,
        }
    )

export const fakeGitHub = (routes: Record<string, Reply | Route>) => {
    const calls: Call[] = []

    vi.stubGlobal(
        'fetch',
        (input: Request | string | URL, init: RequestInit = {}) => {
            const url = new URL(input instanceof Request ? input.url : input)
            const headers = new Headers(init.headers)
            const call: Call = {
                auth: headers.get('authorization'),
                body:
                    typeof init.body === 'string' && init.body
                        ? JSON.parse(init.body)
                        : undefined,
                method: init.method ?? 'GET',
                path: url.pathname,
            }
            calls.push(call)

            const route = routes[`${call.method} ${call.path}`]
            const reply = typeof route === 'function' ? route(call) : route
            return Promise.resolve(
                json(reply ?? { body: { message: 'Not Found' }, status: 404 })
            )
        }
    )

    return calls
}
