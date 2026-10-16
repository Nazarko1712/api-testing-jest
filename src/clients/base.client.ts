import { spec } from 'pactum';

export const BASE_URL = process.env.API_BASE_URL ?? 'https://restful-booker.herokuapp.com';

/**
 * The shape of a tossed pactum response, narrowed once.
 *
 * pactum declares `toss(): Promise<IncomingMessage> | Promise<any>`, and a
 * union containing `any` collapses to `any` — so without this, every
 * `response.json` downstream is untyped and the compiler stops helping. The
 * concrete symptom is that `response.json.bookingid` compiles even when the
 * field is `bookingId`, and the test fails at runtime with `undefined` instead
 * of being rejected at build time.
 *
 * `json` stays `unknown` rather than being typed per endpoint: each client
 * method knows its own response shape and casts there, which keeps the cast
 * next to the knowledge that justifies it.
 */
export interface ApiResponse {
    statusCode: number;
    headers: Record<string, string | string[] | undefined>;
    json: unknown;
    body: unknown;
}

/**
 * Base HTTP client.
 *
 * The design decision worth defending: every method takes the EXPECTED status
 * code as a parameter, defaulting to the happy path.
 *
 *   await api.getBooking(id);           // expects 200
 *   await api.getBooking(999999, 404);  // expects 404
 *
 * So negative cases travel the same code path as positive ones. The alternative
 * — a separate "negative" client, or try/catch around every unhappy call —
 * duplicates the request-building logic and lets the two copies drift until the
 * negative tests are quietly exercising a different request than the positive
 * ones.
 *
 * It also makes the expectation explicit at the call site, which reads as
 * documentation: the test states what it believes before it asserts anything.
 */
export abstract class BaseClient {
    protected readonly baseUrl = BASE_URL;

    protected async get(path: string, status: number, token?: string): Promise<ApiResponse> {
        const request = spec()
            .get(`${this.baseUrl}${path}`)
            .withHeaders('Accept', 'application/json');
        if (token) request.withHeaders('Cookie', `token=${token}`);
        return (await request.expectStatus(status).toss()) as ApiResponse;
    }

    protected async post(
        path: string,
        body: unknown,
        status: number,
        token?: string,
    ): Promise<ApiResponse> {
        const request = spec()
            .post(`${this.baseUrl}${path}`)
            .withHeaders('Content-Type', 'application/json')
            .withHeaders('Accept', 'application/json')
            .withJson(body as object);
        if (token) request.withHeaders('Cookie', `token=${token}`);
        return (await request.expectStatus(status).toss()) as ApiResponse;
    }

    protected async put(
        path: string,
        body: unknown,
        status: number,
        token?: string,
    ): Promise<ApiResponse> {
        const request = spec()
            .put(`${this.baseUrl}${path}`)
            .withHeaders('Content-Type', 'application/json')
            .withHeaders('Accept', 'application/json')
            .withJson(body as object);
        if (token) request.withHeaders('Cookie', `token=${token}`);
        return (await request.expectStatus(status).toss()) as ApiResponse;
    }

    protected async patch(
        path: string,
        body: unknown,
        status: number,
        token?: string,
    ): Promise<ApiResponse> {
        const request = spec()
            .patch(`${this.baseUrl}${path}`)
            .withHeaders('Content-Type', 'application/json')
            .withHeaders('Accept', 'application/json')
            .withJson(body as object);
        if (token) request.withHeaders('Cookie', `token=${token}`);
        return (await request.expectStatus(status).toss()) as ApiResponse;
    }

    protected async delete(path: string, status: number, token?: string): Promise<ApiResponse> {
        const request = spec().delete(`${this.baseUrl}${path}`);
        if (token) request.withHeaders('Cookie', `token=${token}`);
        return (await request.expectStatus(status).toss()) as ApiResponse;
    }
}
