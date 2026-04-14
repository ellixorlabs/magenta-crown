/** Map Photon / OSM feature properties into structured address fields. */

export type StructuredAddress = {
  street: string;
  area: string;
  town: string;
  city: string;
  pincode: string;
};

export function photonFeatureToAddress(feature: {
  properties?: Record<string, string | undefined | number | null>;
}): StructuredAddress {
  const p = feature.properties ?? {};
  const str = (k: string) => (p[k] != null ? String(p[k]).trim() : "");

  const housenumber = str("housenumber");
  const streetName = str("street");
  const street =
    [housenumber, streetName].filter(Boolean).join(" ").trim() ||
    (str("name") && streetName && str("name") !== streetName ? `${str("name")}, ${streetName}` : str("name"));

  const area =
    str("district") ||
    str("locality") ||
    str("neighbourhood") ||
    str("suburb") ||
    str("quarter") ||
    str("borough") ||
    "";

  const town = str("town") || str("city_district") || str("village") || str("hamlet") || "";

  const city = str("city") || str("county") || str("state") || "";

  const pincode = str("postcode");

  return {
    street,
    area,
    town,
    city,
    pincode
  };
}
