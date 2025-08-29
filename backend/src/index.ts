import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { z } from "zod";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import Amadeus from "amadeus";
import fetch from "node-fetch";
import {
  AmadeusFlightOffersResponse,
  FlightSearchParams,
  AmadeusError,
} from "./types/amadeus";

const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_API_KEY!,
  clientSecret: process.env.AMADEUS_API_SECRET!,
});

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json());

// Zod schemas for validation
const ItineraryInputSchema = z.object({
  city: z.string().min(1, "City is required"),
  dates: z.string().min(1, "Dates are required"),
  preferences: z.string().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const ItineraryActivity = z.object({
  activity: z.string().min(1, "Activity is required"),
  location: z.string().min(1, "Location is required"),
  durationInHours: z.number().min(1, "Duration must be at least 1 hour"),
});

const City = z.object({
  shortName: z.string().min(1, "City name is required"),
  iata: z.string().min(1, "IATA code is required"),
});

const ItineraryOutputSchema = z.object({
  days: z.array(
    z.object({
      dayDate: z.string().date(),
      dayNumber: z.number().int().positive(),
      morning: z.array(ItineraryActivity).optional(),
      afternoon: z.array(ItineraryActivity).optional(),
      evening: z.array(ItineraryActivity).optional(),
    })
  ),
});

const FlightInfo = z.object({
  price: z.string(),
  duration: z.string(),
  airline: z.string(),
  departure: z.object({
    date: z.string(),
    time: z.string(),
    airport: z.string(),
  }),
  arrival: z.object({
    date: z.string(),
    time: z.string(),
    airport: z.string(),
  }),
});

const CalendarExportSchema = z.object({
  itinerary: z.object({
    days: z.array(
      z.object({
        dayDate: z.string().date(),
        dayNumber: z.number().int().positive(),
        morning: z.array(ItineraryActivity).optional(),
        afternoon: z.array(ItineraryActivity).optional(),
        evening: z.array(ItineraryActivity).optional(),
      })
    ),
    arrivalCity: City,
    returnCity: City,
  }),
  city: z.string(),
  dates: z.string(),
  flights: z.object({
    outbound: FlightInfo.optional(),
    return: FlightInfo.optional(),
  }).optional(),
});

// Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

function getNearbyAirportApiMarket(lat: number, lon: number) {
  let radiusKm = 500;
  let limit = 1;
  let withFlightInfoOnly = false;
  let url = `https://prod.api.market/api/v1/aedbx/aerodatabox/airports/search/location?lat=${lat}&lon=${lon}&radiusKm=${radiusKm}&limit=${limit}&withFlightInfoOnly=${withFlightInfoOnly}`;

  let options = {
    method: "GET",
    headers: { "x-api-market-key": process.env.API_MARKETAPI_KEY! },
  };

  return fetch(url, options)
    .then((res) => res.json())
    .then((response: any) => response.items[0]);
}

async function flightSearch(
  params: FlightSearchParams
): Promise<AmadeusFlightOffersResponse> {
  try {
    const response: any = await amadeus.shopping.flightOffersSearch.get(params);
    return response.result;
  } catch (error) {
    console.error("Amadeus API error:", error);
    throw error;
  }
}

async function getFlightOptions(
  departureAirportIata: string,
  destinationIata: string,
  departureDate: string,
  returnDate: string
) {
  try {
    // Parse dates from the response - for now, use a simple future date
    const today = new Date();
    const departureDateIso = new Date(departureDate).toISOString().split('T')[0];
    const returnDateIso = new Date(returnDate).toISOString().split('T')[0];

    const flightParams: FlightSearchParams = {
      originLocationCode: departureAirportIata,
      destinationLocationCode: destinationIata,
      departureDate: departureDateIso,
      returnDate: returnDateIso,
      adults: 1
    };

    const flightOffers = await flightSearch(flightParams);
    
    if (flightOffers?.data?.length > 0) {
      const bestOffer = flightOffers.data[0];
      const outbound = bestOffer.itineraries[0];
      const returnFlight = bestOffer.itineraries[1];
      const outboundDepartureDateTime = new Date(outbound.segments[0].departure.at);
      const outboundArrivalDateTime = new Date(outbound.segments[outbound.segments.length - 1].arrival.at);
      const returnDepartureDateTime = returnFlight ? new Date(returnFlight.segments[0].departure.at) : null;
      const returnArrivalDateTime = returnFlight ? new Date(returnFlight.segments[returnFlight.segments.length - 1].arrival.at) : null;

      return {
        outbound: outbound ? {
          price: `${bestOffer.price.total} ${bestOffer.price.currency}`,
          duration: outbound.duration.replace('PT', '').toLowerCase(),
          airline: flightOffers.dictionaries.carriers[outbound.segments[0].carrierCode] || outbound.segments[0].carrierCode,
          departure: {
            date: outboundDepartureDateTime.toLocaleDateString('en-UK'),
            time: outboundDepartureDateTime.toLocaleTimeString('en-UK', { hour: '2-digit', minute: '2-digit' }),
            airport: outbound.segments[0].departure.iataCode
          },
          arrival: {
            date: outboundArrivalDateTime.toLocaleDateString('en-UK'),
            time: outboundArrivalDateTime.toLocaleTimeString('en-UK', { hour: '2-digit', minute: '2-digit' }),
            airport: outbound.segments[outbound.segments.length - 1].arrival.iataCode
          }
        } : undefined,
        return: returnFlight ? {
          price: `${bestOffer.price.total} ${bestOffer.price.currency}`,
          duration: returnFlight.duration.replace('PT', '').toLowerCase(),
          airline: flightOffers.dictionaries.carriers[returnFlight.segments[0].carrierCode] || returnFlight.segments[0].carrierCode,
          departure: {
            date: returnDepartureDateTime!.toLocaleDateString('en-UK'),
            time: returnDepartureDateTime!.toLocaleTimeString('en-UK', { hour: '2-digit', minute: '2-digit' }),
            airport: returnFlight.segments[0].departure.iataCode
          },
          arrival: {
            date: returnArrivalDateTime!.toLocaleDateString('en-UK'),
            time: returnArrivalDateTime!.toLocaleTimeString('en-UK', { hour: '2-digit', minute: '2-digit' }),
            airport: returnFlight.segments[returnFlight.segments.length - 1].arrival.iataCode
          }
        } : undefined
      };
    }
  } catch (error) {
    console.warn('Could not fetch flights:', error);
  }
  return undefined;
}

const model = "gpt-4o-2024-08-06";

function parseDateTime(date: string, time: string): string {
  // Convert from UK format (DD/MM/YYYY) to ISO format
  const [day, month, year] = date.split('/');
  const [hours, minutes] = time.split(':');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes)).toISOString();
}

function formatDateForICS(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeICSText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}

function createICSContent(data: any): string {
  const events = [];

  // Add flight events
  if (data.flights?.outbound) {
    const flight = data.flights.outbound;
    const departureDateTime = new Date(parseDateTime(flight.departure.date, flight.departure.time));
    const arrivalDateTime = new Date(parseDateTime(flight.arrival.date, flight.arrival.time));
    
    events.push({
      uid: `outbound-flight-${Date.now()}@travel-itinerary`,
      summary: `✈️ Outbound Flight - ${flight.airline}`,
      description: `Flight to ${data.city}\nAirline: ${flight.airline}\nDuration: ${flight.duration}\nPrice: ${flight.price}`,
      location: `${flight.departure.airport} → ${flight.arrival.airport}`,
      dtstart: formatDateForICS(departureDateTime),
      dtend: formatDateForICS(arrivalDateTime),
    });
  }

  if (data.flights?.return) {
    const flight = data.flights.return;
    const departureDateTime = new Date(parseDateTime(flight.departure.date, flight.departure.time));
    const arrivalDateTime = new Date(parseDateTime(flight.arrival.date, flight.arrival.time));
    
    events.push({
      uid: `return-flight-${Date.now()}@travel-itinerary`,
      summary: `✈️ Return Flight - ${flight.airline}`,
      description: `Return flight from ${data.city}\nAirline: ${flight.airline}\nDuration: ${flight.duration}\nPrice: ${flight.price}`,
      location: `${flight.departure.airport} → ${flight.arrival.airport}`,
      dtstart: formatDateForICS(departureDateTime),
      dtend: formatDateForICS(arrivalDateTime),
    });
  }

  // Add itinerary activity events
  data.itinerary.days.forEach((day: any, dayIndex: number) => {
    // Parse ISO date string as local date to avoid timezone issues
    const [year, month, dayNum] = day.dayDate.split('-').map(Number);
    const dayDate = new Date(year, month - 1, dayNum);
    
    // Morning activities (9 AM)
    if (day.morning && day.morning.length > 0) {
      day.morning.forEach((activity: any, index: number) => {
        const startTime = new Date(dayDate);
        startTime.setHours(9 + index * activity.durationInHours, 0, 0, 0);
        const endTime = new Date(startTime);
        endTime.setHours(startTime.getHours() + activity.durationInHours);
        
        events.push({
          uid: `morning-${dayIndex}-${index}-${Date.now()}@travel-itinerary`,
          summary: `🌅 ${activity.activity}`,
          description: `Morning activity in ${activity.location}\nDuration: ${activity.durationInHours} hours`,
          location: activity.location,
          dtstart: formatDateForICS(startTime),
          dtend: formatDateForICS(endTime),
        });
      });
    }

    // Afternoon activities (1 PM)
    if (day.afternoon && day.afternoon.length > 0) {
      day.afternoon.forEach((activity: any, index: number) => {
        const startTime = new Date(dayDate);
        startTime.setHours(13 + index * activity.durationInHours, 0, 0, 0);
        const endTime = new Date(startTime);
        endTime.setHours(startTime.getHours() + activity.durationInHours);
        
        events.push({
          uid: `afternoon-${dayIndex}-${index}-${Date.now()}@travel-itinerary`,
          summary: `☀️ ${activity.activity}`,
          description: `Afternoon activity in ${activity.location}\nDuration: ${activity.durationInHours} hours`,
          location: activity.location,
          dtstart: formatDateForICS(startTime),
          dtend: formatDateForICS(endTime),
        });
      });
    }

    // Evening activities (6 PM)
    if (day.evening && day.evening.length > 0) {
      day.evening.forEach((activity: any, index: number) => {
        const startTime = new Date(dayDate);
        startTime.setHours(18 + index * activity.durationInHours, 0, 0, 0);
        const endTime = new Date(startTime);
        endTime.setHours(startTime.getHours() + activity.durationInHours);
        
        events.push({
          uid: `evening-${dayIndex}-${index}-${Date.now()}@travel-itinerary`,
          summary: `🌙 ${activity.activity}`,
          description: `Evening activity in ${activity.location}\nDuration: ${activity.durationInHours} hours`,
          location: activity.location,
          dtstart: formatDateForICS(startTime),
          dtend: formatDateForICS(endTime),
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
    icsContent += `SUMMARY:${escapeICSText(event.summary)}
`;
    icsContent += `DESCRIPTION:${escapeICSText(event.description)}
`;
    icsContent += `LOCATION:${escapeICSText(event.location)}
`;
    icsContent += `DTSTAMP:${formatDateForICS(new Date())}
`;
    icsContent += `END:VEVENT
`;
  });
  
  icsContent += `END:VCALENDAR`;
  
  return icsContent;
}

app.post("/api/itinerary", async (req, res) => {
  try {
    const { city, dates, preferences, lat, lng } = ItineraryInputSchema.parse(
      req.body
    );

    const now = new Date();

    const datesPrompt = 
      `You are a travel agent helping users plan their trips. 
       For context, today is ${now.toLocaleDateString()}. 
       First, define the trip dates for a trip to ${city} for the following user-provided dates: ${dates}. 
       Return the arrival date and return date in ISO format.
       Also, return information about the departure city (short name and IATA code) and the arrival city (short name and IATA code).
       Ensure the arrival date is not in the past.`;

    const flightsData = openai.responses.parse({
      model: model,
      input: [{ role: "system", content: datesPrompt }],
      text: {
        format: zodTextFormat(
          z.object({
            arrivalCity: City,
            arrivalDate: z.string().min(1, "Arrival date is required"),
            returnCity: City,
            returnDate: z.string().min(1, "Return date is required"),
          }),
          "dates"
        ),
      },
    });

    const getDepartureAirport = async () => {
      const airport = await getNearbyAirportApiMarket(lat, lng);
      if (airport && airport.shortName && airport.iata) {
        return {
          shortName: airport.shortName,
          iata: airport.iata,
        };
      } else {
        throw new Error("Could not find nearby airport: Invalid API response with missing fields");
      }
    };

    const [flightsDataResponse, departureAirport] = await Promise.all([
      flightsData,
      getDepartureAirport(),
    ]);


    // Search for flights after we have the itinerary
    let flights = undefined;
    if (flightsDataResponse.output_parsed?.arrivalCity?.iata) {
      flights = await getFlightOptions(
        departureAirport.iata,
        flightsDataResponse.output_parsed.arrivalCity.iata,
        flightsDataResponse.output_parsed.arrivalDate,
        flightsDataResponse.output_parsed.returnDate
      );
    }
    
    const arrivalAirport = flights?.outbound?.arrival.airport || flightsDataResponse.output_parsed?.arrivalCity?.shortName;
    const arrivalDate = flights?.outbound?.arrival.time!
    const returnAirport = flights?.return?.departure.airport || flightsDataResponse.output_parsed?.returnCity?.shortName;
    const returnDate = flights?.return?.departure.time!

    const itineraryPrompt = `You are a travel agent helping users plan their trips. 
      Create a travel itinerary for ${city} for ${dates}. 
      For context, today is ${now.toLocaleDateString()}.
      ${preferences ? `Preferences: ${preferences}` : ""
    } Please provide a detailed day-by-day plan with activities, locations, and tips.
      We have defined that the user will be arriving on ${arrivalDate} to ${arrivalAirport} and returning on ${returnDate} to ${returnAirport}.
      Take into account whether the arrival or departure times are in the morning, afternoon, or evening when planning activities for those days.
      For each day, provide a dayDate field with the actual date in ISO format and a dayNumber field with the sequential day number (1, 2, 3, etc.).
    `;

    // Run OpenAI and airport queries concurrently
    const daysResponse =
      await openai.responses.parse({
        model: "gpt-4o-2024-08-06",
        input: [{ role: "system", content: itineraryPrompt }],
        text: {
          format: zodTextFormat(ItineraryOutputSchema, "itinerary"),
        },
      });

    const itinerary = {
      arrivalCity: flightsDataResponse.output_parsed?.arrivalCity!,
      returnCity: flightsDataResponse.output_parsed?.returnCity!,
      days: daysResponse.output_parsed!.days,
    };
   
    res.json({
      itinerary,
      city,
      dates,
      preferences,
      departureAirport,
      flights,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Validation error", details: error.errors });
    }

    console.error("OpenAI API error:", error);
    res.status(500).json({ error: "Failed to generate itinerary" });
  }
});

app.post("/api/export-calendar", async (req, res) => {
  try {
    const data = CalendarExportSchema.parse(req.body);
    
    // Generate ICS content
    const icsContent = createICSContent(data);
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', `attachment; filename="${data.city.replace(/[^a-zA-Z0-9]/g, '_')}_itinerary.ics"`);
    
    res.send(icsContent);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Validation error", details: error.errors });
    }

    console.error("ICS export error:", error);
    res.status(500).json({ 
      error: "Failed to export calendar",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
