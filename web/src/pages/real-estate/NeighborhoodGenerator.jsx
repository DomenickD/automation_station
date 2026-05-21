import { useState } from "react";
import { Icon } from "@iconify/react";
import GeneratorForm from "../../components/GeneratorForm";
import OutputCard from "../../components/OutputCard";
import ListingSelector from "../../components/ListingSelector";
import { useGenerate } from "../../hooks/useGenerate";
import client from "../../api/client";

const FIELDS = [
  { name: "neighborhood", label: "Neighborhood / Area", required: true, placeholder: "e.g. Westchase, Coral Gables, Hyde Park" },
  { name: "location", label: "City / ZIP", required: true, placeholder: "e.g. Tampa, FL 33626" },
  { name: "property_type", label: "Property Type Focus", placeholder: "Single Family" },
  { name: "price_range", label: "Price Range in Area", placeholder: "$450K – $650K" },
  { name: "agent_notes", label: "Agent Notes", type: "textarea", rows: 3, placeholder: "e.g. Seller's market, avg 12 days on market. Strong school district. New Publix opening Q3." },
];

export default function NeighborhoodGenerator() {
  const { generate, regenerate, loading, result, error } = useGenerate("/generate/re/neighborhood");

  const [formKey, setFormKey] = useState(0);
  const [values, setValues] = useState({ neighborhood: "", location: "", property_type: "", price_range: "", agent_notes: "" });
  const [selectedAddress, setSelectedAddress] = useState("");
  const [researching, setResearching] = useState(false);
  const [researchMsg, setResearchMsg] = useState("");
  const [researchMsgType, setResearchMsgType] = useState("info");

  function handleListingSelect(listing) {
    const neighborhood = listing.neighborhood || listing.city || "";
    const locationParts = [listing.city, listing.state, listing.zip_code].filter(Boolean);
    const location = locationParts.join(", ");

    setSelectedAddress(listing.address || "");
    setValues({
      neighborhood,
      location,
      property_type: listing.property_type || "",
      price_range: listing.price_target || listing.value_range || listing.list_price || "",
      agent_notes: listing.market_notes || "",
    });
    setFormKey((k) => k + 1);
    setResearchMsg("");
  }

  async function handleResearch() {
    setResearching(true);
    setResearchMsg("");
    try {
      const res = await client.post("/generate/re/neighborhood/research", {
        address: selectedAddress,
        neighborhood: values.neighborhood,
        location: values.location,
      });

      setValues((prev) => ({
        neighborhood: res.data.neighborhood || prev.neighborhood,
        location: res.data.location || prev.location,
        property_type: res.data.property_type || prev.property_type,
        price_range: res.data.price_range || prev.price_range,
        agent_notes: [prev.agent_notes, res.data.agent_notes].filter(Boolean).join("\n\n").trim(),
      }));
      setFormKey((k) => k + 1);
      setResearchMsg(res.data.message || "Research complete.");
      setResearchMsgType("success");
    } catch (err) {
      setResearchMsg(err.response?.data?.detail || "Research failed. Please fill in details manually.");
      setResearchMsgType("error");
    } finally {
      setResearching(false);
    }
  }

  const canResearch = !!(values.neighborhood.trim() || values.location.trim() || selectedAddress.trim());

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Neighborhood Report</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Create a client-facing neighborhood market report. Load a saved listing or fill in the area details below.
      </p>

      <ListingSelector onSelect={handleListingSelect} />

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-5">

        {/* Research button */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleResearch}
            disabled={!canResearch || researching}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "var(--brand-color, #2563eb)" }}
          >
            {researching ? (
              <>
                <Icon icon="svg-spinners:ring-resize" className="w-4 h-4" />
                Searching online…
              </>
            ) : (
              <>
                <Icon icon="mdi:web" className="w-4 h-4 shrink-0" />
                Research Neighborhood Online
              </>
            )}
          </button>

          {!canResearch && (
            <p className="text-xs text-center text-gray-400 dark:text-gray-500">
              Load a saved listing or enter a neighborhood / city above to enable online research
            </p>
          )}

          {researchMsg && (
            <div
              className={`rounded-lg border px-3 py-2 text-xs ${
                researchMsgType === "error"
                  ? "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300"
                  : "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300"
              }`}
            >
              {researchMsg}
            </div>
          )}
        </div>

        <GeneratorForm
          key={formKey}
          fields={FIELDS}
          onSubmit={generate}
          loading={loading}
          submitLabel="Generate Neighborhood Report"
          initialValues={values}
          outputSlot={
            result && (
              <OutputCard
                output={result.output}
                documentId={result.document_id}
                onRegenerate={regenerate}
                loading={loading}
              />
            )
          }
        />
      </div>
    </div>
  );
}
