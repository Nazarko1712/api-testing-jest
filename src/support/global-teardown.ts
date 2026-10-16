/**
 * Runs ONCE after the whole suite.
 *
 * Deliberately a no-op for data cleanup: every spec removes the bookings it
 * created in its own `afterEach`/`afterAll`, because cleanup that lives only in
 * a global teardown leaves orphans behind whenever the run is interrupted —
 * Ctrl-C, a CI timeout, a crashed worker.
 *
 * The hook is kept so the lifecycle is visible, and so a future suite-level
 * resource (a seeded account, a leased environment) has an obvious home.
 */
export default function globalTeardown(): void {
    process.stdout.write('[teardown] per-spec cleanup already ran\n');
}
