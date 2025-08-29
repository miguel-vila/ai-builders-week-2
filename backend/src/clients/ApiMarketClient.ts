import fetch from "node-fetch";

export interface Airport {
  shortName: string;
  iata: string;
}

export class ApiMarketClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getNearbyAirport(lat: number, lon: number): Promise<Airport> {
    const radiusKm = 500;
    const limit = 1;
    const withFlightInfoOnly = false;
    const url = `https://prod.api.market/api/v1/aedbx/aerodatabox/airports/search/location?lat=${lat}&lon=${lon}&radiusKm=${radiusKm}&limit=${limit}&withFlightInfoOnly=${withFlightInfoOnly}`;

    const options = {
      method: "GET",
      headers: { "x-api-market-key": this.apiKey },
    };

    try {
      const response = await fetch(url, options);
      const data: any = await response.json();
      const airport = data.items[0];
      
      if (airport && airport.shortName && airport.iata) {
        return {
          shortName: airport.shortName,
          iata: airport.iata,
        };
      } else {
        throw new Error("Could not find nearby airport: Invalid API response with missing fields");
      }
    } catch (error) {
      console.error("API Market error:", error);
      throw error;
    }
  }
}