import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { ParsedResponse } from "openai/resources/responses/responses";
import { z } from "zod";

const ItineraryActivity = z.object({
  activity: z.string().min(1, "Activity is required"),
  location: z.string().min(1, "Location is required"),
  durationInHours: z.number().min(1, "Duration must be at least 1 hour"),
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

type ItineraryOutput = z.infer<typeof ItineraryOutputSchema>;

const City = z.object({
  shortName: z.string().min(1, "City name is required"),
  iata: z.string().min(1, "IATA code is required"),
});

const TravelDatesAndCitiesSchema = z.object({
  arrivalCity: City,
  arrivalDate: z.string().min(1, "Arrival date is required"),
  returnCity: City,
  returnDate: z.string().min(1, "Return date is required"),
});

type TravelDatesAndCities = z.infer<typeof TravelDatesAndCitiesSchema>;

export class OpenAIClient {
  private openai: OpenAI;
  private model = "gpt-4o-2024-08-06";

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async parseDatesAndCities(
    city: string,
    dates: string,
    now: Date
  ): Promise<ParsedResponse<TravelDatesAndCities>> {
    const datesPrompt = `You are a travel agent helping users plan their trips. 
       For context, today is ${now.toLocaleDateString()}. 
       First, define the trip dates for a trip to ${city} for the following user-provided dates: ${dates}. 
       Return the arrival date and return date in ISO format.
       Also, return information about the departure city (short name and IATA code) and the arrival city (short name and IATA code).
       Ensure the arrival date is not in the past.`;

    return this.openai.responses.parse({
      model: this.model,
      input: [{ role: "system", content: datesPrompt }],
      text: {
        format: zodTextFormat(TravelDatesAndCitiesSchema, "dates"),
      },
    });
  }

  async generateItinerary(
    city: string,
    dates: string,
    preferences: string | undefined,
    now: Date,
    arrivalDate: string,
    arrivalAirport: string,
    returnDate: string,
    returnAirport: string
  ): Promise<ParsedResponse<ItineraryOutput>> {
    const itineraryPrompt = `You are a travel agent helping users plan their trips. 
      Create a travel itinerary for ${city} for ${dates}. 
      For context, today is ${now.toLocaleDateString()}.
      ${
        preferences ? `Preferences: ${preferences}` : ""
      } Please provide a detailed day-by-day plan with activities, locations, and tips.
      We have defined that the user will be arriving on ${arrivalDate} to ${arrivalAirport} and returning on ${returnDate} to ${returnAirport}.
      Take into account whether the arrival or departure times are in the morning, afternoon, or evening when planning activities for those days.
      For each day, provide a dayDate field with the actual date in ISO format and a dayNumber field with the sequential day number (1, 2, 3, etc.).
    `;

    return this.openai.responses.parse({
      model: this.model,
      input: [{ role: "system", content: itineraryPrompt }],
      text: {
        format: zodTextFormat(ItineraryOutputSchema, "itinerary"),
      },
    });
  }
}
