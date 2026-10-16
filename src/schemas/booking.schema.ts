import Ajv, { type JSONSchemaType } from 'ajv';
import addFormats from 'ajv-formats';
import type { Booking, CreatedBooking } from '../clients/booking.client';

/**
 * Schema validation with AJV.
 *
 * Why schemas at all when the tests already assert on values: a value assertion
 * answers "is this booking's name Alice", a schema answers "is this still a
 * booking". They catch different regressions.
 *
 * The one that bites in production is the second: a field changes from number
 * to string, an optional field becomes required, or a nested object flattens.
 * Value assertions keep passing because the value is still *present and equal*
 * after coercion, while every consumer downstream breaks.
 *
 * `additionalProperties: false` is deliberate. Without it a schema only proves
 * the expected fields exist; with it, a NEW field in the response fails the
 * test. On an API that owns user data that is the behaviour you want — an
 * unannounced extra field is exactly how a response starts leaking more than it
 * should.
 */
const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

export const bookingSchema: JSONSchemaType<Booking> = {
    type: 'object',
    properties: {
        firstname: { type: 'string', minLength: 1 },
        lastname: { type: 'string', minLength: 1 },
        totalprice: { type: 'number' },
        depositpaid: { type: 'boolean' },
        bookingdates: {
            type: 'object',
            properties: {
                checkin: { type: 'string', format: 'date' },
                checkout: { type: 'string', format: 'date' },
            },
            required: ['checkin', 'checkout'],
            additionalProperties: false,
        },
        additionalneeds: { type: 'string', nullable: true },
    },
    required: ['firstname', 'lastname', 'totalprice', 'depositpaid', 'bookingdates'],
    additionalProperties: false,
};

export const createdBookingSchema: JSONSchemaType<CreatedBooking> = {
    type: 'object',
    properties: {
        bookingid: { type: 'number' },
        booking: bookingSchema,
    },
    required: ['bookingid', 'booking'],
    additionalProperties: false,
};

export const bookingIdListSchema = {
    type: 'array',
    items: {
        type: 'object',
        properties: { bookingid: { type: 'number' } },
        required: ['bookingid'],
        additionalProperties: false,
    },
} as const;

export const validateBooking = ajv.compile(bookingSchema);
export const validateCreatedBooking = ajv.compile(createdBookingSchema);
export const validateBookingIdList = ajv.compile(bookingIdListSchema);

/** Turn AJV's error array into something a failure message can show. */
export function schemaErrors(validator: { errors?: unknown }): string {
    return JSON.stringify(validator.errors ?? [], null, 2);
}
