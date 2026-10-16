import { bookingClient } from '@clients/booking.client';
import { aBooking } from '@support/booking.factory';
import { validateBookingIdList, schemaErrors } from '@schemas/booking.schema';

/**
 * Filtering and list behaviour.
 *
 * The suite runs against a SHARED public instance that other people are writing
 * to at the same time, which rules out any assertion of the form "the list
 * contains exactly N items". Every test here therefore asserts a property that
 * holds regardless of foreign data:
 *
 *   - my record IS present after I create it
 *   - a filter never returns something that contradicts the filter
 *   - the response shape stays valid
 *
 * That is the same discipline a parallel suite needs against its own backend,
 * where other WORKERS play the role of other people.
 */
describe('Booking list and filters', () => {
    let token: string;
    const created: number[] = [];

    beforeAll(async () => {
        token = await bookingClient.authenticate();
    });

    afterAll(async () => {
        for (const id of created) {
            await bookingClient.deleteBooking(id, token).catch(() => {});
        }
    });

    it('returns a list of ids with a stable shape', async () => {
        const ids = await bookingClient.listIds();

        const valid = validateBookingIdList(ids);
        expect(valid || schemaErrors(validateBookingIdList)).toBe(true);
        expect(ids.length).toBeGreaterThan(0);
    });

    it('finds a booking by its unique first name', async () => {
        const payload = aBooking().withUniqueName().build();
        const { bookingid } = await bookingClient.createBooking(payload);
        created.push(bookingid);

        const matches = await bookingClient.filterByName(payload.firstname);

        // Unique marker, so exactly one result is a safe expectation even on a
        // shared instance.
        expect(matches).toEqual([{ bookingid }]);
    });

    it('returns an empty list for a name nobody has', async () => {
        const matches = await bookingClient.filterByName('zzz-no-such-guest-zzz');

        expect(matches).toEqual([]);
    });

    it('every row returned by a name filter actually carries that name', async () => {
        const payload = aBooking().withUniqueName().build();
        const { bookingid } = await bookingClient.createBooking(payload);
        created.push(bookingid);

        const matches = await bookingClient.filterByName(payload.firstname);

        // Guards against the filter being ignored server-side — the failure mode
        // where an endpoint accepts a query parameter and quietly returns
        // everything.
        for (const row of matches) {
            const booking = await bookingClient.getBooking(row.bookingid);
            expect(booking.firstname).toBe(payload.firstname);
        }
    });

    /**
     * Data-driven with `test.each`: one body, many inputs. Jest prints the
     * parameters in the test name, so a failure says WHICH case broke without
     * opening the file.
     */
    describe.each([
        ['empty string', ''],
        ['sql-ish input', "' OR 1=1 --"],
        ['script tag', '<script>alert(1)</script>'],
        ['very long value', 'a'.repeat(300)],
        ['unicode', 'Ольга'],
    ])('filter by name: %s', (_label, value) => {
        it('responds 200 without leaking an error', async () => {
            const matches = await bookingClient.filterByName(value);

            // The point is not that these find anything — it is that hostile or
            // awkward input never produces a 5xx. An unhandled exception
            // reaching the edge is both a bug and an information leak.
            expect(Array.isArray(matches)).toBe(true);
        });
    });
});
