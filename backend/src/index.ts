import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { z } from "zod";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { PlacesClient } from "@googlemaps/places";
import Amadeus from "amadeus";
import fetch from "node-fetch";
import { AmadeusFlightOffersResponse, FlightSearchParams, AmadeusError } from "./types/amadeus";

const placesClient = new PlacesClient({
  apiKey: process.env.GOOGLE_MAPS_API_KEY!,
})

const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_API_KEY!,
  clientSecret: process.env.AMADEUS_API_SECRET!
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
  arrivalCity: City,
  returnCity: City,
  days: z.array(
    z.object({
      day: z.string(),
      morning: z.array(ItineraryActivity),
      afternoon: z.array(ItineraryActivity),
      evening: z.array(ItineraryActivity),
    })
  ),
});

// Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

function getNearbyAirportApiMarket(lat: number, lon: number) {
  let radiusKm = 500
  let limit = 1
  let withFlightInfoOnly = false
  let url = `https://prod.api.market/api/v1/aedbx/aerodatabox/airports/search/location?lat=${lat}&lon=${lon}&radiusKm=${radiusKm}&limit=${limit}&withFlightInfoOnly=${withFlightInfoOnly}`;

  let options = { method: 'GET', headers: { 'x-api-market-key': process.env.API_MARKETAPI_KEY! } };

  return fetch(url, options)
    .then(res => res.json())
    .then((response: any) => response.items[0])
}

async function flightSearch(params: FlightSearchParams): Promise<AmadeusFlightOffersResponse> {
  try {
    const response: any = await amadeus.shopping.flightOffers.get(params);
    return response.result;
  } catch (error) {
    console.error('Amadeus API error:', error);
    throw error;
  }
}

app.get("/api/closest-airport", async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: "Latitude and longitude are required" });
  }

  console.log(`Finding closest airport to lat: ${lat}, lng: ${lng}`);

  const {shortName, iata} = await getNearbyAirportApiMarket(Number(lat), Number(lng));
  res.json({ shortName, iata });
});

app.post("/api/itinerary", async (req, res) => {
  try {
    const { city, dates, preferences } = ItineraryInputSchema.parse(req.body);

    const itineraryPrompt = `You are a travel agent helping users plan their trips. Create a travel itinerary for ${city} for ${dates}. ${
      preferences ? `Preferences: ${preferences}` : ""
    } Please provide a detailed day-by-day plan with activities, locations, and tips.`;

    const response = await openai.responses.parse({
      model: "gpt-4o-2024-08-06",
      input: [{ role: "system", content: itineraryPrompt }],
      text: {
        format: zodTextFormat(ItineraryOutputSchema, "itinerary"),
      },
    });

    // const airportsPrompt = 

    res.json({
      itinerary: response.output_parsed,
      city,
      dates,
      preferences,
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

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
