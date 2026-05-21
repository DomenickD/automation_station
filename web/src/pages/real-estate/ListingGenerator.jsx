import { useState } from "react";
import GeneratorForm from "../../components/GeneratorForm";
import OutputCard from "../../components/OutputCard";
import ListingSelector from "../../components/ListingSelector";
import { useGenerate } from "../../hooks/useGenerate";
import { savedListingToInitialValues } from "../../utils/savedListingFormValues";

const FIELDS = [
  { name: "address", label: "Property Address", required: true, placeholder: "123 Main St, Austin, TX 78701" },
  { name: "bedrooms", label: "Bedrooms", type: "stepper", min: 1, max: 10, step: 1, required: true, group: "bed-bath" },
  { name: "bathrooms", label: "Bathrooms", type: "stepper", min: 1, max: 8, step: 0.5, required: true, group: "bed-bath" },
  { name: "sqft", label: "Sq Ft", type: "number", required: true, placeholder: "1850", group: "bed-bath" },
  { name: "lot_size", label: "Lot Size", placeholder: "0.25 ac", group: "bed-bath" },
  { name: "year_built", label: "Year Built", type: "number", placeholder: "2005", group: "bed-bath" },
  {
    name: "features",
    label: "Key Features",
    type: "chips",
    required: true,
    options: [
      "Hardwood Floors", "Tile Floors", "New Carpet",
      "Updated Kitchen", "Granite Countertops", "Quartz Countertops", "Stainless Appliances", "Kitchen Island",
      "Updated Bathrooms", "Primary Suite", "Walk-in Closet", "Soaking Tub",
      "Open Floor Plan", "Vaulted Ceilings", "Crown Molding", "Fireplace",
      "1-Car Garage", "2-Car Garage", "3-Car Garage", "EV Charger",
      "New Roof", "New HVAC", "Solar Panels", "Smart Home",
      "Pool", "Hot Tub", "Screened Porch", "Covered Patio", "Fenced Yard",
      "Waterfront", "Corner Lot", "Cul-de-Sac", "Mountain Views", "City Views",
    ],
  },
  { name: "neighborhood", label: "Neighborhood Highlights", type: "textarea", rows: 2, placeholder: "Walkable to downtown, top-rated schools, near Whole Foods..." },
  { name: "price_target", label: "Price Point / Target Buyer", placeholder: "Listed at $485K, targeting young families" },
  {
    name: "tone",
    label: "Tone",
    type: "select",
    required: true,
    options: [
      { value: "Family", label: "Family" },
      { value: "Luxury", label: "Luxury" },
      { value: "Investment", label: "Investment" },
      { value: "Starter Home", label: "Starter Home" },
    ],
    defaultValue: "Family",
  },
  { name: "notes", label: "Additional Notes", type: "textarea", rows: 2, placeholder: "Any extra context for Claude..." },
];

export default function ListingGenerator() {
  const { generate, regenerate, loading, result, error } = useGenerate("/generate/re/listing");
  const [formKey, setFormKey] = useState(0);
  const [initialValues, setInitialValues] = useState({});

  function handleListingSelect(listing) {
    setInitialValues(savedListingToInitialValues(listing, FIELDS));
    setFormKey((k) => k + 1);
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Listing Description Generator</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Generate MLS descriptions, marketing copy, social captions, and email teasers from property details.
      </p>

      <ListingSelector onSelect={handleListingSelect} />

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <GeneratorForm
          key={formKey}
          fields={FIELDS}
          onSubmit={generate}
          loading={loading}
          initialValues={initialValues}
          outputSlot={result && <OutputCard output={result.output} documentId={result.document_id} onRegenerate={regenerate} loading={loading} />}
        />
      </div>
    </div>
  );
}
