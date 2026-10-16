import { faker } from '@faker-js/faker';
import type { Booking } from '../clients/booking.client';

/**
 * Test-data factory.
 *
 * Every booking is generated per run, never reused from a fixture file. The
 * reason is not tidiness — it is that shared fixtures are what make a suite
 * un-parallelisable: two workers mutating the same record produce failures that
 * look like product bugs and cannot be reproduced on demand.
 *
 * A builder rather than a plain object so a test can state ONLY the field it
 * cares about, and the rest stays realistic:
 *
 *   aBooking().withName('Ada', 'Lovelace').build()
 *   aBooking().withoutDeposit().build()
 */
export class BookingBuilder {
    private booking: Booking;

    constructor() {
        const checkin = faker.date.soon({ days: 30 });
        const checkout = faker.date.soon({ days: 10, refDate: checkin });

        this.booking = {
            firstname: faker.person.firstName(),
            lastname: faker.person.lastName(),
            totalprice: faker.number.int({ min: 50, max: 2000 }),
            depositpaid: faker.datatype.boolean(),
            bookingdates: {
                checkin: BookingBuilder.toIsoDate(checkin),
                checkout: BookingBuilder.toIsoDate(checkout),
            },
            additionalneeds: faker.helpers.arrayElement(['Breakfast', 'Late checkout', 'Parking']),
        };
    }

    /** The API expects bare `YYYY-MM-DD`, not a full ISO timestamp. */
    private static toIsoDate(date: Date): string {
        return date.toISOString().slice(0, 10);
    }

    withName(firstname: string, lastname: string): this {
        this.booking.firstname = firstname;
        this.booking.lastname = lastname;
        return this;
    }

    withPrice(totalprice: number): this {
        this.booking.totalprice = totalprice;
        return this;
    }

    withoutDeposit(): this {
        this.booking.depositpaid = false;
        return this;
    }

    withDates(checkin: string, checkout: string): this {
        this.booking.bookingdates = { checkin, checkout };
        return this;
    }

    withoutAdditionalNeeds(): this {
        delete this.booking.additionalneeds;
        return this;
    }

    /** Unique marker so filter tests can find exactly their own record. */
    withUniqueName(): this {
        const unique = faker.string.alphanumeric({ length: 10, casing: 'lower' });
        this.booking.firstname = `test${unique}`;
        return this;
    }

    build(): Booking {
        return structuredClone(this.booking);
    }
}

export const aBooking = (): BookingBuilder => new BookingBuilder();
