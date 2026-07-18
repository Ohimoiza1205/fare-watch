// City names for the airports this tool actually watches, so a route can read
// "London to Lubbock" instead of bare codes. Unknown codes fall back to the
// code itself rather than guessing; a wrong city would be an invented fact.

const CITY: Record<string, string> = {
  LHR: "London",
  LGW: "London",
  STN: "London",
  LTN: "London",
  LCY: "London",
  MAN: "Manchester",
  BHX: "Birmingham",
  EDI: "Edinburgh",
  JFK: "New York",
  EWR: "New York",
  LGA: "New York",
  BOS: "Boston",
  ORD: "Chicago",
  ATL: "Atlanta",
  DFW: "Dallas",
  IAH: "Houston",
  LAX: "Los Angeles",
  SFO: "San Francisco",
  MIA: "Miami",
  SEA: "Seattle",
  DEN: "Denver",
  LBB: "Lubbock",
  AUS: "Austin",
  LOS: "Lagos",
  ABV: "Abuja",
  PHC: "Port Harcourt",
  KAN: "Kano",
};

export function cityForIata(code: string): string {
  return CITY[code.toUpperCase()] ?? code.toUpperCase();
}
