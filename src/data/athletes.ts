// Athlete data types and raw data

export interface Athlete {
  name: string;
  sport: string;
  league: string;
  team: string;
}

export interface EbayAvgRecord {
  avgListing?: number;
  taguchiListing?: number;
  trimmedListing?: number;
  avg?: number;
  average?: number;
  sport?: string;
  marketStabilityCV?: number;
  avgDaysOnMarket?: number;
  marketplaces?: {
    EBAY_US?: { marketStabilityCV?: number; avgDaysOnMarket?: number };
    EBAY_CA?: { marketStabilityCV?: number; avgDaysOnMarket?: number };
  };
}

export interface EbayAvgData {
  _meta?: { updatedAt?: string };
  [key: string]: EbayAvgRecord | { updatedAt?: string } | undefined;
}

export const athleteDataRaw: Athlete[] = [
  { name: "Ronald Acuña Jr.", sport: "Baseball", league: "MLB", team: "Braves" },
  { name: "Jackson Chourio", sport: "Baseball", league: "MLB", team: "Brewers" },
  { name: "Maikel Garcia", sport: "Baseball", league: "MLB", team: "Royals" },
  { name: "Salvador Perez", sport: "Baseball", league: "MLB", team: "Royals" },
  { name: "Eugenio Suárez", sport: "Baseball", league: "MLB", team: "Diamondbacks" },
  { name: "Jose Altuve", sport: "Baseball", league: "MLB", team: "Astros" },
  { name: "Luis Arráez", sport: "Baseball", league: "MLB", team: "Padres" },
  { name: "William Contreras", sport: "Baseball", league: "MLB", team: "Brewers" },
  { name: "Anthony Santander", sport: "Baseball", league: "MLB", team: "Orioles" },
  { name: "Wilyer Abreu", sport: "Baseball", league: "MLB", team: "Red Sox" },
  { name: "Eduardo Rodriguez", sport: "Baseball", league: "MLB", team: "Diamondbacks" },
  { name: "Francisco Alvarez", sport: "Baseball", league: "MLB", team: "Mets" },
  { name: "Yeferson Soteldo", sport: "Soccer", league: "Serie A", team: "Grêmio" },
  { name: "Jon Aramburu", sport: "Soccer", league: "La Liga", team: "Real Sociedad" },
  { name: "Josef Martínez", sport: "Soccer", league: "MLS", team: "CF Montréal" },
  { name: "Salomón Rondón", sport: "Soccer", league: "Liga MX", team: "Pachuca" },
  { name: "Darwin Machís", sport: "Soccer", league: "La Liga", team: "Cádiz" },
  { name: "Jefferson Savarino", sport: "Soccer", league: "Serie A", team: "Botafogo" },
  { name: "Yangel Herrera", sport: "Soccer", league: "La Liga", team: "Girona" },
  { name: "Michael Carrera", sport: "Basketball", league: "LNBP", team: "Astros de Jalisco" },
  { name: "Daniel Dhers", sport: "BMX", league: "BMX", team: "BMX" },
  { name: "Yulimar Rojas", sport: "Track & Field", league: "Track & Field", team: "Track & Field" },
  { name: "Jhonattan Vegas", sport: "Golf", league: "PGA", team: "Golf" },
  { name: "Garbiñe Muguruza", sport: "Tennis", league: "WTA", team: "Venezuela" },
  { name: "Marlon Vera", sport: "MMA", league: "UFC", team: "Venezuela" },
  { name: "Andres Borregales", sport: "Football", league: "NFL", team: "New England Patriots" },
  { name: "Amleto Monacelli", sport: "Bowling", league: "Bowling", team: "PBA50" },
];
