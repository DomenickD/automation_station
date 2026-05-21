import { useState } from "react";
import { useLocation } from "react-router-dom";
import GeneratorForm from "../../components/GeneratorForm";
import OutputCard from "../../components/OutputCard";
import ListingSelector from "../../components/ListingSelector";
import { useGenerate } from "../../hooks/useGenerate";
import { savedListingToInitialValues } from "../../utils/savedListingFormValues";

const EMAIL_TYPES = [
  { value: "post_showing_buyer", label: "Post-Showing Follow-Up (Buyer)" },
  { value: "offer_congratulations", label: "Offer Congratulations & Next Steps" },
  { value: "price_reduction", label: "Price Reduction Announcement" },
  { value: "seller_checkin_30", label: "30-Day Seller Check-In" },
  { value: "seller_checkin_60", label: "60-Day Seller Check-In" },
  { value: "seller_checkin_90", label: "90-Day Seller Check-In" },
  { value: "expired_listing_outreach", label: "Expired Listing Outreach (Cold)" },
  { value: "open_house_invitation", label: "Open House Invitation" },
  { value: "buyer_intro", label: "New Buyer Introduction" },
];

const FIELDS = [
  {
    name: "email_type",
    label: "Email Type",
    type: "select",
    required: true,
    options: EMAIL_TYPES,
  },
  { name: "agent_name", label: "Agent Name", required: true, placeholder: "Sarah Johnson" },
  { name: "client_name", label: "Client Name", required: true, placeholder: "John & Mary Smith" },
  { name: "property_address", label: "Property Address", placeholder: "456 Oak Ave, Austin TX" },
  {
    name: "context",
    label: "Key Context / Details",
    type: "textarea",
    rows: 3,
    required: true,
    placeholder: "What happened at the showing? Any feedback? What's next?",
  },
  { name: "notes", label: "Additional Instructions", type: "textarea", rows: 2, placeholder: "e.g. Keep it short, mention the pool..." },
];

export default function REEmailDrafter() {
  const location = useLocation();
  const { generate, regenerate, loading, result, error } = useGenerate("/generate/re/email");
  const [formKey, setFormKey] = useState(0);
  const [initialValues, setInitialValues] = useState(() => location.state || {});


  function handleListingSelect(listing) {
    setInitialValues(savedListingToInitialValues(listing, FIELDS));
    setFormKey((k) => k + 1);
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Email Drafter</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Generate professional real estate emails for every client scenario.
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
