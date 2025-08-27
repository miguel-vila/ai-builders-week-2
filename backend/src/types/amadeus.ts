// Amadeus API Type Definitions
// Based on Amadeus Flight Offers Search API response structure

export interface AmadeusFlightOffersResponse {
  meta: {
    count: number;
  };
  data: FlightOffer[];
  dictionaries: {
    locations: Record<string, LocationInfo>;
    aircraft: Record<string, string>;
    currencies: Record<string, string>;
    carriers: Record<string, string>;
  };
}

export interface FlightOffer {
  type: 'flight-offer';
  id: string;
  source: 'GDS' | string;
  instantTicketingRequired: boolean;
  nonHomogeneous: boolean;
  oneWay: boolean;
  lastTicketingDate: string;
  numberOfBookableSeats: number;
  itineraries: Itinerary[];
  price: Price;
  pricingOptions: PricingOptions;
  validatingAirlineCodes: string[];
  travelerPricings: TravelerPricing[];
}

export interface Itinerary {
  duration: string; // ISO 8601 duration format (e.g., "PT9H10M")
  segments: FlightSegment[];
}

export interface FlightSegment {
  departure: FlightEndpoint;
  arrival: FlightEndpoint;
  carrierCode: string;
  number: string;
  aircraft: {
    code: string;
  };
  operating: {
    carrierCode: string;
  };
  duration: string; // ISO 8601 duration format
  id: string;
  numberOfStops: number;
  blacklistedInEU: boolean;
}

export interface FlightEndpoint {
  iataCode: string;
  at: string; // ISO 8601 datetime format
}

export interface Price {
  currency: string;
  total: string;
  base: string;
  fees: Fee[];
  grandTotal: string;
}

export interface Fee {
  amount: string;
  type: 'SUPPLIER' | 'TICKETING' | string;
}

export interface PricingOptions {
  fareType: ('PUBLISHED' | string)[];
  includedCheckedBagsOnly: boolean;
}

export interface TravelerPricing {
  travelerId: string;
  fareOption: 'STANDARD' | string;
  travelerType: 'ADULT' | 'CHILD' | 'INFANT' | string;
  price: {
    currency: string;
    total: string;
    base: string;
  };
  fareDetailsBySegment: FareDetails[];
}

export interface FareDetails {
  segmentId: string;
  cabin: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST' | string;
  fareBasis: string;
  class: string;
  includedCheckedBags: {
    quantity: number;
  };
}

export interface LocationInfo {
  cityCode: string;
  countryCode: string;
}

// Additional types for flight search parameters
export interface FlightSearchParams {
  originLocationCode: string;
  destinationLocationCode: string;
  departureDate: string; // YYYY-MM-DD format
  returnDate?: string; // YYYY-MM-DD format for round trips
  adults: number;
}

// Error response structure
export interface AmadeusError {
  errors: Array<{
    status: number;
    code: number;
    title: string;
    detail: string;
    source?: {
      parameter?: string;
      pointer?: string;
    };
  }>;
}
