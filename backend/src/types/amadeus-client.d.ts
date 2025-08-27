// Type declarations for amadeus npm module
declare module 'amadeus' {
  interface AmadeusClientConfig {
    clientId: string;
    clientSecret: string;
    hostname?: string;
    environment?: 'test' | 'production';
    logLevel?: 'silent' | 'warn' | 'debug';
  }

  interface ShoppingFlightOffers {
    get(params: any): Promise<AmadeusFlightOffersResponse>;
  }

  interface Shopping {
    flightOffersSearch: ShoppingFlightOffers;
  }

  class Amadeus {
    constructor(config: AmadeusClientConfig);
    shopping: Shopping;
  }

  export = Amadeus;
}
