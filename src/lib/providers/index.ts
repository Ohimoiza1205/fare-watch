import { FareProvider } from "./types";
import { flightsSky } from "./flightsSky";

export function enabledProviders(): FareProvider[] {
  return [flightsSky];
}
