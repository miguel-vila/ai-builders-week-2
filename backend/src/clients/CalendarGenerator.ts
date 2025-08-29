export interface CalendarEvent {
  uid: string;
  summary: string;
  description: string;
  location: string;
  dtstart: string;
  dtend: string;
}

export interface CalendarData {
  itinerary: {
    days: Array<{
      dayDate: string;
      dayNumber: number;
      morning?: Array<{ activity: string; location: string; durationInHours: number }>;
      afternoon?: Array<{ activity: string; location: string; durationInHours: number }>;
      evening?: Array<{ activity: string; location: string; durationInHours: number }>;
    }>;
    arrivalCity: { shortName: string; iata: string };
    returnCity: { shortName: string; iata: string };
  };
  city: string;
  dates: string;
  flights?: {
    outbound?: {
      price: string;
      duration: string;
      airline: string;
      departure: { date: string; time: string; airport: string };
      arrival: { date: string; time: string; airport: string };
    };
    return?: {
      price: string;
      duration: string;
      airline: string;
      departure: { date: string; time: string; airport: string };
      arrival: { date: string; time: string; airport: string };
    };
  };
}

export class CalendarGenerator {
  private parseDateTime(date: string, time: string): string {
    // Convert from UK format (DD/MM/YYYY) to ISO format
    const [day, month, year] = date.split('/');
    const [hours, minutes] = time.split(':');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes)).toISOString();
  }

  private formatDateForICS(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  private escapeICSText(text: string): string {
    return text.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
  }

  generateICSContent(data: CalendarData): string {
    const events: CalendarEvent[] = [];

    // Add flight events
    if (data.flights?.outbound) {
      const flight = data.flights.outbound;
      const departureDateTime = new Date(this.parseDateTime(flight.departure.date, flight.departure.time));
      const arrivalDateTime = new Date(this.parseDateTime(flight.arrival.date, flight.arrival.time));
      
      events.push({
        uid: `outbound-flight-${Date.now()}@travel-itinerary`,
        summary: `✈️ Outbound Flight - ${flight.airline}`,
        description: `Flight to ${data.city}\nAirline: ${flight.airline}\nDuration: ${flight.duration}\nPrice: ${flight.price}`,
        location: `${flight.departure.airport} → ${flight.arrival.airport}`,
        dtstart: this.formatDateForICS(departureDateTime),
        dtend: this.formatDateForICS(arrivalDateTime),
      });
    }

    if (data.flights?.return) {
      const flight = data.flights.return;
      const departureDateTime = new Date(this.parseDateTime(flight.departure.date, flight.departure.time));
      const arrivalDateTime = new Date(this.parseDateTime(flight.arrival.date, flight.arrival.time));
      
      events.push({
        uid: `return-flight-${Date.now()}@travel-itinerary`,
        summary: `✈️ Return Flight - ${flight.airline}`,
        description: `Return flight from ${data.city}\nAirline: ${flight.airline}\nDuration: ${flight.duration}\nPrice: ${flight.price}`,
        location: `${flight.departure.airport} → ${flight.arrival.airport}`,
        dtstart: this.formatDateForICS(departureDateTime),
        dtend: this.formatDateForICS(arrivalDateTime),
      });
    }

    // Add itinerary activity events
    data.itinerary.days.forEach((day, dayIndex) => {
      // Parse ISO date string as local date to avoid timezone issues
      const [year, month, dayNum] = day.dayDate.split('-').map(Number);
      const dayDate = new Date(year, month - 1, dayNum);
      
      // Morning activities (9 AM)
      if (day.morning && day.morning.length > 0) {
        day.morning.forEach((activity, index) => {
          const startTime = new Date(dayDate);
          startTime.setHours(9 + index * activity.durationInHours, 0, 0, 0);
          const endTime = new Date(startTime);
          endTime.setHours(startTime.getHours() + activity.durationInHours);
          
          events.push({
            uid: `morning-${dayIndex}-${index}-${Date.now()}@travel-itinerary`,
            summary: `🌅 ${activity.activity}`,
            description: `Morning activity in ${activity.location}\nDuration: ${activity.durationInHours} hours`,
            location: activity.location,
            dtstart: this.formatDateForICS(startTime),
            dtend: this.formatDateForICS(endTime),
          });
        });
      }

      // Afternoon activities (1 PM)
      if (day.afternoon && day.afternoon.length > 0) {
        day.afternoon.forEach((activity, index) => {
          const startTime = new Date(dayDate);
          startTime.setHours(13 + index * activity.durationInHours, 0, 0, 0);
          const endTime = new Date(startTime);
          endTime.setHours(startTime.getHours() + activity.durationInHours);
          
          events.push({
            uid: `afternoon-${dayIndex}-${index}-${Date.now()}@travel-itinerary`,
            summary: `☀️ ${activity.activity}`,
            description: `Afternoon activity in ${activity.location}\nDuration: ${activity.durationInHours} hours`,
            location: activity.location,
            dtstart: this.formatDateForICS(startTime),
            dtend: this.formatDateForICS(endTime),
          });
        });
      }

      // Evening activities (6 PM)
      if (day.evening && day.evening.length > 0) {
        day.evening.forEach((activity, index) => {
          const startTime = new Date(dayDate);
          startTime.setHours(18 + index * activity.durationInHours, 0, 0, 0);
          const endTime = new Date(startTime);
          endTime.setHours(startTime.getHours() + activity.durationInHours);
          
          events.push({
            uid: `evening-${dayIndex}-${index}-${Date.now()}@travel-itinerary`,
            summary: `🌙 ${activity.activity}`,
            description: `Evening activity in ${activity.location}\nDuration: ${activity.durationInHours} hours`,
            location: activity.location,
            dtstart: this.formatDateForICS(startTime),
            dtend: this.formatDateForICS(endTime),
          });
        });
      }
    });

    // Generate ICS content
    let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Travel Itinerary//EN
CALSCALE:GREGORIAN
`;
    
    events.forEach(event => {
      icsContent += `BEGIN:VEVENT
`;
      icsContent += `UID:${event.uid}
`;
      icsContent += `DTSTART:${event.dtstart}
`;
      icsContent += `DTEND:${event.dtend}
`;
      icsContent += `SUMMARY:${this.escapeICSText(event.summary)}
`;
      icsContent += `DESCRIPTION:${this.escapeICSText(event.description)}
`;
      icsContent += `LOCATION:${this.escapeICSText(event.location)}
`;
      icsContent += `DTSTAMP:${this.formatDateForICS(new Date())}
`;
      icsContent += `END:VEVENT
`;
    });
    
    icsContent += `END:VCALENDAR`;
    
    return icsContent;
  }

  generateCalendarFilename(city: string): string {
    return `${city.replace(/[^a-zA-Z0-9]/g, '_')}_itinerary.ics`;
  }
}