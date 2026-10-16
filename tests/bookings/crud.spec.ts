import { bookingClient } from '@clients/booking.client';
import { aBooking } from '@support/booking.factory';

describe('Booking CRUD', () => {
    let token: string;
    const created: number[] = [];

    beforeAll(async () => {
        token = await bookingClient.authenticate();
    });

    /**
     * Cleanup lives next to the data that needs it, not only in a global
     * teardown: an interrupted run (Ctrl-C, CI timeout, crashed worker) never
     * reaches a global hook and leaves orphan records behind.
     */
    afterAll(async () => {
        for (const id of created) {
            await bookingClient.deleteBooking(id, token).catch(() => {
                // Already gone — a delete test may have removed it.
            });
        }
    });

    it('creates a booking and echoes it back unchanged', async () => {
        const payload = aBooking().build();

        const result = await bookingClient.createBooking(payload);
        created.push(result.bookingid);

        expect(result).toMatchCreatedBookingSchema();
        expect(result.bookingid).toEqual(expect.any(Number));
        expect(result.booking).toEqual(payload);
    });

    it('reads a booking back by id', async () => {
        const payload = aBooking().build();
        const { bookingid } = await bookingClient.createBooking(payload);
        created.push(bookingid);

        const fetched = await bookingClient.getBooking(bookingid);

        expect(fetched).toMatchBookingSchema();
        expect(fetched).toEqual(payload);
    });

    it('replaces every field with PUT', async () => {
        const { bookingid } = await bookingClient.createBooking(aBooking().build());
        created.push(bookingid);

        const replacement = aBooking().withName('Ada', 'Lovelace').withPrice(999).build();
        const updated = await bookingClient.replaceBooking(bookingid, replacement, token);

        expect(updated).toMatchBookingSchema();
        expect(updated).toEqual(replacement);
    });

    it('changes only the supplied fields with PATCH', async () => {
        const original = aBooking().withName('Grace', 'Hopper').build();
        const { bookingid } = await bookingClient.createBooking(original);
        created.push(bookingid);

        const updated = await bookingClient.updateBooking(bookingid, { totalprice: 1 }, token);

        // The distinction between PUT and PATCH, asserted rather than assumed:
        // everything except the patched field must survive untouched.
        expect(updated.totalprice).toBe(1);
        expect(updated.firstname).toBe('Grace');
        expect(updated.lastname).toBe('Hopper');
        expect(updated.bookingdates).toEqual(original.bookingdates);
    });

    it('removes a booking and then cannot find it', async () => {
        const { bookingid } = await bookingClient.createBooking(aBooking().build());

        await bookingClient.deleteBooking(bookingid, token);

        await bookingClient.getBooking(bookingid, 404);
    });

    it('omits an optional field without inventing a default', async () => {
        const payload = aBooking().withoutAdditionalNeeds().build();

        const result = await bookingClient.createBooking(payload);
        created.push(result.bookingid);

        // An absent optional field must stay absent, not come back as "" or null.
        expect(result.booking.additionalneeds).toBeUndefined();
    });
});
