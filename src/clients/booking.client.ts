import { BaseClient } from './base.client';

export interface BookingDates {
    checkin: string;
    checkout: string;
}

export interface Booking {
    firstname: string;
    lastname: string;
    totalprice: number;
    depositpaid: boolean;
    bookingdates: BookingDates;
    additionalneeds?: string;
}

export interface CreatedBooking {
    bookingid: number;
    booking: Booking;
}

class BookingClient extends BaseClient {
    /** The API issues a short-lived token used as a cookie, not a bearer header. */
    async authenticate(
        username = process.env.API_USERNAME ?? 'admin',
        password = process.env.API_PASSWORD ?? 'password123',
        status = 200,
    ): Promise<string> {
        const response = await this.post('/auth', { username, password }, status);
        return (response.json as { token: string }).token;
    }

    async listIds(status = 200) {
        const response = await this.get('/booking', status);
        return response.json as Array<{ bookingid: number }>;
    }

    async getBooking(id: number, status = 200) {
        const response = await this.get(`/booking/${id}`, status);
        return response.json as Booking;
    }

    async createBooking(booking: Booking, status = 200) {
        const response = await this.post('/booking', booking, status);
        return response.json as CreatedBooking;
    }

    /** PUT replaces the whole resource, so a partial body is a client error. */
    async replaceBooking(id: number, booking: Booking, token: string, status = 200) {
        const response = await this.put(`/booking/${id}`, booking, status, token);
        return response.json as Booking;
    }

    /** PATCH merges — only the supplied fields change. */
    async updateBooking(id: number, changes: Partial<Booking>, token: string, status = 200) {
        const response = await this.patch(`/booking/${id}`, changes, status, token);
        return response.json as Booking;
    }

    /**
     * Note the default of 201.
     *
     * A successful DELETE should answer 200 or 204; this API answers 201
     * ("Created") for a deletion. The client encodes the real behaviour rather
     * than the correct one, and `tests/contract/api-defects.spec.ts` documents
     * why — so the quirk is visible in one place instead of being silently
     * absorbed into every caller.
     */
    async deleteBooking(id: number, token: string, status = 201) {
        return this.delete(`/booking/${id}`, status, token);
    }

    async filterByName(firstname: string, status = 200) {
        const response = await this.get(
            `/booking?firstname=${encodeURIComponent(firstname)}`,
            status,
        );
        return response.json as Array<{ bookingid: number }>;
    }

    async filterByCheckin(date: string, status = 200) {
        const response = await this.get(`/booking?checkin=${date}`, status);
        return response.json as Array<{ bookingid: number }>;
    }
}

export const bookingClient = new BookingClient();
