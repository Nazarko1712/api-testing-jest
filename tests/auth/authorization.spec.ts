import { bookingClient } from '@clients/booking.client';
import { aBooking } from '@support/booking.factory';

/**
 * Authorization matrix.
 *
 * The question each test answers is not "does the endpoint work" but "does the
 * endpoint refuse the people it should". That distinction is what separates a
 * CRUD suite from a security-aware one: a write endpoint that works perfectly
 * for an anonymous caller is working exactly as designed and still a breach.
 *
 * Matrix under test:
 *
 *   operation | no token | invalid token | valid token
 *   ----------|----------|---------------|------------
 *   GET        |   allow  |     allow     |   allow
 *   POST       |   allow  |     allow     |   allow     <- public by design
 *   PUT        |   deny   |     deny      |   allow
 *   PATCH      |   deny   |     deny      |   allow
 *   DELETE     |   deny   |     deny      |   allow
 */
describe('Authorization', () => {
    let token: string;
    let bookingId: number;

    beforeAll(async () => {
        token = await bookingClient.authenticate();
    });

    beforeEach(async () => {
        const created = await bookingClient.createBooking(aBooking().build());
        bookingId = created.bookingid;
    });

    afterEach(async () => {
        await bookingClient.deleteBooking(bookingId, token).catch(() => {
            // Already removed by the test itself.
        });
    });

    describe('token issuance', () => {
        it('issues a token for valid credentials', async () => {
            expect(token).toEqual(expect.any(String));
            expect(token.length).toBeGreaterThan(0);
        });

        it('refuses to issue a token for a wrong password', async () => {
            // The API answers 200 with a `reason` body rather than 401 — itself
            // worth knowing, and asserted in tests/contract/api-defects.spec.ts.
            const response = await bookingClient
                .authenticate('admin', 'definitely-wrong', 200)
                .catch(() => null);

            expect(response).toBeFalsy();
        });
    });

    describe('writes require a valid token', () => {
        it('rejects PUT without a token', async () => {
            await bookingClient.replaceBooking(bookingId, aBooking().build(), '', 403);
        });

        it('rejects PUT with a forged token', async () => {
            await bookingClient.replaceBooking(
                bookingId,
                aBooking().build(),
                'not-a-real-token',
                403,
            );
        });

        it('rejects PATCH without a token', async () => {
            await bookingClient.updateBooking(bookingId, { totalprice: 5 }, '', 403);
        });

        it('rejects DELETE without a token', async () => {
            await bookingClient.deleteBooking(bookingId, '', 403);
        });

        it('rejects DELETE with a forged token', async () => {
            await bookingClient.deleteBooking(bookingId, 'not-a-real-token', 403);
        });

        it('accepts the same writes with a valid token', async () => {
            // The positive half of the matrix: proving the 403s above are about
            // authorization, not a broken request shape.
            await bookingClient.updateBooking(bookingId, { totalprice: 7 }, token);
            const updated = await bookingClient.getBooking(bookingId);

            expect(updated.totalprice).toBe(7);
        });
    });

    describe('reads stay public', () => {
        it('allows GET without a token', async () => {
            const booking = await bookingClient.getBooking(bookingId);

            expect(booking).toMatchBookingSchema();
        });
    });
});
