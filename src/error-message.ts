// Promise rejections and catch clauses are typed unknown; anything can be thrown.
export const errorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : String(error)
