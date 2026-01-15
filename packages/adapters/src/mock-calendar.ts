import { CalendarAdapter } from './types';

export class MockCalendarAdapter implements CalendarAdapter {
  async createEvent(params: {
    title: string;
    startTime: Date;
    endTime: Date;
    attendees?: string[];
    description?: string;
  }): Promise<{ id: string }> {
    const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[MockCalendar] Created event ${eventId}: ${params.title}`);
    return { id: eventId };
  }

  async getAvailability(startTime: Date, endTime: Date): Promise<Array<{ start: Date; end: Date }>> {
    // Mock: vrací několik dostupných slotů
    const slots: Array<{ start: Date; end: Date }> = [];
    const current = new Date(startTime);
    while (current < endTime) {
      slots.push({
        start: new Date(current),
        end: new Date(current.getTime() + 30 * 60 * 1000), // 30 min sloty
      });
      current.setTime(current.getTime() + 60 * 60 * 1000); // +1 hodina
    }
    return slots.slice(0, 5); // max 5 slotů
  }
}
