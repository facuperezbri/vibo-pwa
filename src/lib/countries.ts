import { Country, State } from "country-state-city";

export interface CountryOption {
  code: string;
  name: string;
}

export interface ProvinceOption {
  code: string;
  name: string;
}

/**
 * Get all countries as options for select
 */
export function getCountries(): CountryOption[] {
  return Country.getAllCountries().map((country) => ({
    code: country.isoCode,
    name: country.name,
  }));
}

/**
 * Get provinces/states for a given country
 */
export function getProvincesByCountry(countryCode: string): ProvinceOption[] {
  if (!countryCode) return [];

  return State.getStatesOfCountry(countryCode).map((state) => ({
    code: state.isoCode || state.name,
    name: state.name,
  }));
}

/**
 * Get country name by code
 */
export function getCountryName(countryCode: string): string | undefined {
  const country = Country.getCountryByCode(countryCode);
  return country?.name;
}

/**
 * Get province name by code and country
 */
export function getProvinceName(
  provinceCode: string,
  countryCode: string
): string | undefined {
  const state = State.getStateByCodeAndCountry(provinceCode, countryCode);
  return state?.name;
}
