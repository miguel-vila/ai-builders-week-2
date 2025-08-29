import Amadeus from "amadeus";
import {
  AmadeusFlightOffersResponse,
  FlightSearchParams,
} from "../types/amadeus";

export class AmadeusClient {
  private amadeus: Amadeus;

  constructor(clientId: string, clientSecret: string) {
    this.amadeus = new Amadeus({
      clientId,
      clientSecret,
    });
  }

  async searchFlightOffers(
    params: FlightSearchParams
  ): Promise<AmadeusFlightOffersResponse> {
    try {
      const response: any = await this.amadeus.shopping.flightOffersSearch.get(params);
      return response.result;
    } catch (error) {
      console.error("Amadeus API error:", error);
      throw error;
    }
  }

  async getFlightOptions(
    departureAirportIata: string,
    destinationIata: string,
    departureDate: string,
    returnDate: string
  ) {
    try {
      // Parse dates and format for API
      const departureDateIso = new Date(departureDate).toISOString().split('T')[0];
      const returnDateIso = new Date(returnDate).toISOString().split('T')[0];

      const flightParams: FlightSearchParams = {
        originLocationCode: departureAirportIata,
        destinationLocationCode: destinationIata,
        departureDate: departureDateIso,
        returnDate: returnDateIso,
        adults: 1
      };

      const flightOffers = await this.searchFlightOffers(flightParams);
      
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
}