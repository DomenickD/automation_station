const FIELD_ALIASES = {
  address: ["address", "subject_property", "property_address"],
  subject_property: ["address", "subject_property"],
  property_address: ["address", "property_address"],
  bedrooms: ["bedrooms"],
  bathrooms: ["bathrooms"],
  sqft: ["sqft"],
  lot_size: ["lot_size"],
  year_built: ["year_built"],
  price_target: ["price_target", "target_buyer"],
  price_range: ["price_target", "value_range"],
  price: ["list_price", "price_target", "current_price"],
  list_price: ["list_price", "price_target"],
  current_price: ["current_price", "list_price", "price_target"],
  recommended_price: ["recommended_price"],
  target_buyer: ["target_buyer", "price_target"],
  features: ["features", "headline_feature"],
  headline_feature: ["headline_feature", "features"],
  neighborhood: ["neighborhood", "city"],
  location: ["neighborhood", "city"],
  property_type: ["property_type"],
  style: ["property_style"],
  condition: ["condition"],
  garage: ["garage"],
  specs: ["property_details"],
  subject_details: ["property_details"],
  property_details: ["property_details"],
  details: ["property_details"],
  market_notes: ["market_notes"],
  comparables: ["comparables"],
  competitors: ["competitors"],
  dom: ["dom"],
  showings: ["showings"],
  showing_count: ["showings"],
  offers: ["offers"],
  feedback: ["feedback"],
  open_house: ["open_house"],
  showing_instructions: ["showing_instructions"],
  closing_pref: ["closing_pref"],
  inclusions: ["inclusions"],
  exclusions: ["exclusions"],
  hoa: ["hoa"],
  hoa_fee: ["hoa_fee"],
  hoa_covers: ["hoa_covers"],
  schools: ["schools"],
  flood_zone: ["flood_zone"],
  utilities: ["utilities"],
  updates: ["updates"],
  seller_name: ["seller_name", "seller_names"],
  seller_names: ["seller_names", "seller_name"],
  seller_email: ["seller_email"],
  seller_phone: ["seller_phone"],
  buyer_name: ["buyer_name", "buyer_names"],
  buyer_names: ["buyer_names", "buyer_name"],
  buyer_email: ["buyer_email"],
  buyer_phone: ["buyer_phone"],
  owner_name: ["seller_name", "seller_names"],
  start_date: ["start_date"],
  end_date: ["end_date"],
  commission: ["commission"],
  buyer_commission: ["buyer_commission"],
  lockbox: ["lockbox"],
  mls_auth: ["mls_auth"],
  special_terms: ["special_terms"],
  notes: ["notes", "agent_notes", "raw_context"],
  agent_notes: ["agent_notes", "notes"],
  context: ["raw_context", "notes"],
  client_name: ["seller_name", "seller_names", "buyer_name", "buyer_names"],
  home_highlights: ["features", "headline_feature"],
  key_stats: ["property_details"],
  ig_handle: ["ig_handle"],
};

function valueFromListing(listing, keys) {
  for (const key of keys) {
    const value = listing?.[key];
    if (value !== undefined && value !== null && value !== "") return String(value);
  }
  return "";
}

function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString() : String(value);
}

export function formatListingSpecs(listing) {
  const parts = [];
  if (valueFromListing(listing, ["bedrooms"])) parts.push(`${listing.bedrooms}BR`);
  if (valueFromListing(listing, ["bathrooms"])) parts.push(`${listing.bathrooms}BA`);
  if (valueFromListing(listing, ["sqft"])) parts.push(`${formatNumber(listing.sqft)} sqft`);
  if (valueFromListing(listing, ["lot_size"])) parts.push(`${listing.lot_size} lot`);
  if (valueFromListing(listing, ["year_built"])) parts.push(`built ${listing.year_built}`);
  if (valueFromListing(listing, ["property_type"])) parts.push(listing.property_type);
  if (valueFromListing(listing, ["garage"])) parts.push(`${listing.garage} garage`);
  if (valueFromListing(listing, ["condition"])) parts.push(listing.condition);
  if (valueFromListing(listing, ["features"])) parts.push(listing.features);
  return parts.join(", ");
}

export function savedListingToInitialValues(listing, fields = []) {
  const values = {};
  for (const field of fields) {
    const aliases = FIELD_ALIASES[field.name] || [field.name];
    let value = valueFromListing(listing, aliases);
    if (!value && ["specs", "subject_details", "key_stats", "property_details", "details"].includes(field.name)) {
      value = formatListingSpecs(listing);
    }
    values[field.name] = value;
  }
  return values;
}

export function savedListingToCmaValues(listing) {
  return {
    subjectProperty: valueFromListing(listing, ["address"]),
    subjectDetails: [
      formatListingSpecs(listing),
      valueFromListing(listing, ["property_details"]),
    ].filter(Boolean).join(", "),
    priceRange: valueFromListing(listing, ["price_target", "value_range", "list_price"]),
    marketNotes: valueFromListing(listing, ["market_notes"]),
  };
}
