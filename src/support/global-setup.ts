import { request } from 'pactum';
import { BASE_URL } from '../clients/base.client';

/**
 * Runs ONCE before the whole suite, outside the worker processes.
 *
 * Two jobs:
 *
 *  1. Fail fast if the target is unreachable. Without this every spec times out
 *     separately and the real cause — "the API is down" — is buried under
 *     thirty identical timeouts.
 *
 *  2. Set the default request timeout for Pactum globally, so no individual
 *     test needs to remember it.
 */
export default async function globalSetup(): Promise<void> {
    request.setDefaultTimeout(20_000);

    const started = Date.now();
    try {
        const response = await fetch(`${BASE_URL}/ping`, {
            signal: AbortSignal.timeout(20_000),
        });

        // The health endpoint answers 201, which is itself odd for a GET ping.
        if (response.status !== 201 && response.status !== 200) {
            throw new Error(`unexpected health status ${response.status}`);
        }

        process.stdout.write(
            `\n[setup] ${BASE_URL} reachable in ${Date.now() - started}ms\n`,
        );
    } catch (error) {
        throw new Error(
            `[setup] target API is not reachable at ${BASE_URL}: ${String(error)}\n` +
                'The suite runs against a public demo instance; it may be sleeping or down.',
        );
    }
}
