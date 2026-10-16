import { bookingClient } from '@clients/booking.client';
import { aBooking } from '@support/booking.factory';

/**
 * Defects found in the target API, asserted as they ACTUALLY behave.
 *
 * Each test here states the real response and carries a comment saying what the
 * correct one would be. That choice is deliberate:
 *
 *  - Asserting the correct behaviour would leave the suite permanently red, and
 *    a permanently red suite stops being read.
 *  - Deleting the case would lose the knowledge entirely.
 *  - Asserting reality and documenting the gap keeps the run green, keeps the
 *    finding visible, and fails loudly the day the API is fixed — which is
 *    exactly when the test should be revisited.
 *
 * On a real project each of these would carry a ticket reference instead of a
 * paragraph.
 */
describe('Known API defects', () => {
    let token: string;

    beforeAll(async () => {
        token = await bookingClient.authenticate();
    });

    it('DELETE answers 201 Created instead of 200 or 204', async () => {
        const { bookingid } = await bookingClient.createBooking(aBooking().build());

        // Correct: 200 with no body, or 204 No Content. 201 means "Created",
        // which is the opposite of what just happened. Any client that branches
        // on the status code to decide "was something created" gets it wrong.
        await bookingClient.deleteBooking(bookingid, token, 201);
    });

    it('the health endpoint answers 201 for a GET ping', async () => {
        // Correct: 200. A GET that creates nothing should not report 201.
        const response = await fetch('https://restful-booker.herokuapp.com/ping');

        expect(response.status).toBe(201);
    });

    it('failed authentication answers 200 with a reason body, not 401', async () => {
        const response = await fetch('https://restful-booker.herokuapp.com/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'wrong-on-purpose' }),
        });
        const body = (await response.json()) as { reason?: string; token?: string };

        // Correct: 401 Unauthorized. Returning 200 forces every client to parse
        // the body to discover it failed, and anything that only checks
        // `response.ok` treats a rejected login as a successful one.
        expect(response.status).toBe(200);
        expect(body.token).toBeUndefined();
        expect(body.reason).toBe('Bad credentials');
    });

    it('a malformed booking id answers 404 rather than 400', async () => {
        // Arguable rather than plainly wrong: 400 Bad Request would describe
        // "this is not an id" more precisely than 404 Not Found, which claims
        // the lookup happened. Recorded because the distinction matters to a
        // client deciding whether to retry.
        await bookingClient.getBooking('not-a-number' as unknown as number, 404);
    });

    it('PUT with a partial body answers 400, which is correct', async () => {
        const { bookingid } = await bookingClient.createBooking(aBooking().build());

        // The contrast case: PUT replaces the whole resource, so a partial body
        // is genuinely a client error. Included so the spec is not only a list
        // of complaints — the API gets this one right.
        const response = await fetch(
            `https://restful-booker.herokuapp.com/booking/${bookingid}`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Cookie: `token=${token}`,
                },
                body: JSON.stringify({ firstname: 'OnlyThisField' }),
            },
        );

        expect(response.status).toBe(400);

        await bookingClient.deleteBooking(bookingid, token).catch(() => {});
    });
});
