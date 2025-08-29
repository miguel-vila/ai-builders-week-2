import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { z } from "zod";
import { AmadeusClient } from "./clients/AmadeusClient";
import { OpenAIClient } from "./clients/OpenAIClient";
import { ApiMarketClient } from "./clients/ApiMarketClient";
import { CalendarGenerator } from "./clients/CalendarGenerator";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize service clients
const amadeusClient = new AmadeusClient(
  process.env.AMADEUS_API_KEY!,
  process.env.AMADEUS_API_SECRET!
);
const openaiClient = new OpenAIClient(process.env.OPENAI_API_KEY!);
const apiMarketClient = new ApiMarketClient(process.env.API_MARKETAPI_KEY!);
const calendarGenerator = new CalendarGenerator();

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



app.post("/api/itinerary", async (req, res) => {
  try {
    const { city, dates, preferences, lat, lng } = ItineraryInputSchema.parse(
      req.body
    );

    const now = new Date();

    const flightsData = openaiClient.parseDatesAndCities(city, dates, now);
    const departureAirportPromise = apiMarketClient.getNearbyAirport(lat, lng);

    const [flightsDataResponse, departureAirport] = await Promise.all([
      flightsData,
      departureAirportPromise,
    ]);


    // Search for flights after we have the itinerary
    let flights = undefined;
    if (flightsDataResponse.output_parsed?.arrivalCity?.iata) {
      flights = await amadeusClient.getFlightOptions(
        departureAirport.iata,
        flightsDataResponse.output_parsed.arrivalCity.iata,
        flightsDataResponse.output_parsed.arrivalDate,
        flightsDataResponse.output_parsed.returnDate
      );
    }
    
    const arrivalAirport = flights?.outbound?.arrival.airport || flightsDataResponse.output_parsed?.arrivalCity?.shortName || city;
    const arrivalDate = flights?.outbound?.arrival.time || flightsDataResponse.output_parsed?.arrivalDate || "your arrival date";
    const returnAirport = flights?.return?.departure.airport || flightsDataResponse.output_parsed?.returnCity?.shortName || "your departure location";
    const returnDate = flights?.return?.departure.time || flightsDataResponse.output_parsed?.returnDate || "your departure date";

    // Generate itinerary using OpenAI client
    const daysResponse = await openaiClient.generateItinerary(
      city,
      dates,
      preferences,
      now,
      arrivalDate,
      arrivalAirport,
      returnDate,
      returnAirport
    );

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
    
    // Generate ICS content using calendar generator
    const icsContent = calendarGenerator.generateICSContent(data);
    const filename = calendarGenerator.generateCalendarFilename(data.city);
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
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
