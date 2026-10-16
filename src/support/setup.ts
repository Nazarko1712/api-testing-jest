import { validateBooking, validateCreatedBooking, schemaErrors } from '../schemas/booking.schema';

/**
 * Custom matchers, so a schema failure reads as a schema failure.
 *
 * `expect(body).toMatchBookingSchema()` fails with the AJV error list — which
 * field, what was expected, what arrived. A bare `expect(valid).toBe(true)`
 * fails with "expected true, received false" and tells you nothing.
 */
expect.extend({
    toMatchBookingSchema(received: unknown) {
        const pass = validateBooking(received);
        return {
            pass,
            message: () =>
                pass
                    ? 'expected payload NOT to match the booking schema'
                    : `payload does not match the booking schema:\n${schemaErrors(validateBooking)}`,
        };
    },

    toMatchCreatedBookingSchema(received: unknown) {
        const pass = validateCreatedBooking(received);
        return {
            pass,
            message: () =>
                pass
                    ? 'expected payload NOT to match the created-booking schema'
                    : `payload does not match the created-booking schema:\n${schemaErrors(validateCreatedBooking)}`,
        };
    },
});

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace jest {
        interface Matchers<R> {
            toMatchBookingSchema(): R;
            toMatchCreatedBookingSchema(): R;
        }
    }
}

export {};
