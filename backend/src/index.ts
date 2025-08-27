import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { z } from "zod";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { PlacesClient } from "@googlemaps/places";
import Amadeus from "amadeus";
import fetch from "node-fetch";
import {
  AmadeusFlightOffersResponse,
  FlightSearchParams,
  AmadeusError,
} from "./types/amadeus";

const placesClient = new PlacesClient({
  apiKey: process.env.GOOGLE_MAPS_API_KEY!,
});

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
  arrivalCity: City,
  arrivalDate: z.string().min(1, "Arrival date is required"),
  returnCity: City,
  returnDate: z.string().min(1, "Return date is required"),
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

      return {
        outbound: outbound ? {
          price: `${bestOffer.price.total} ${bestOffer.price.currency}`,
          duration: outbound.duration.replace('PT', '').toLowerCase(),
          airline: flightOffers.dictionaries.carriers[outbound.segments[0].carrierCode] || outbound.segments[0].carrierCode,
          departure: {
            time: new Date(outbound.segments[0].departure.at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            airport: outbound.segments[0].departure.iataCode
          },
          arrival: {
            time: new Date(outbound.segments[outbound.segments.length - 1].arrival.at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            airport: outbound.segments[outbound.segments.length - 1].arrival.iataCode
          }
        } : undefined,
        return: returnFlight ? {
          price: `${bestOffer.price.total} ${bestOffer.price.currency}`,
          duration: returnFlight.duration.replace('PT', '').toLowerCase(),
          airline: flightOffers.dictionaries.carriers[returnFlight.segments[0].carrierCode] || returnFlight.segments[0].carrierCode,
          departure: {
            time: new Date(returnFlight.segments[0].departure.at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            airport: returnFlight.segments[0].departure.iataCode
          },
          arrival: {
            time: new Date(returnFlight.segments[returnFlight.segments.length - 1].arrival.at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
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

app.post("/api/itinerary", async (req, res) => {
  try {
    const { city, dates, preferences, lat, lng } = ItineraryInputSchema.parse(
      req.body
    );

    const now = new Date();

    const itineraryPrompt = `You are a travel agent helping users plan their trips. For context, today is ${now.toLocaleDateString()}. Create a travel itinerary for ${city} for ${dates}. ${
      preferences ? `Preferences: ${preferences}` : ""
    } Please provide a detailed day-by-day plan with activities, locations, and tips.`;

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

    // Run OpenAI and airport queries concurrently
    const [response, departureAirport] = await Promise.all([
      openai.responses.parse({
        model: "gpt-4o-2024-08-06",
        input: [{ role: "system", content: itineraryPrompt }],
        text: {
          format: zodTextFormat(ItineraryOutputSchema, "itinerary"),
        },
      }),
      getDepartureAirport(),
    ]);

    // Search for flights after we have the itinerary
    let flights = undefined;
    if (response.output_parsed?.arrivalCity?.iata) {
      flights = await getFlightOptions(
        departureAirport.iata,
        response.output_parsed.arrivalCity.iata,
        response.output_parsed.arrivalDate,
        response.output_parsed.returnDate
      );
    }

    res.json({
      itinerary: response.output_parsed,
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

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
