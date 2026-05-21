import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CONTRACT_MODULES } from "../real-estate/moduleConfigs";
import GeneratorForm from "../../components/GeneratorForm";
import ListingSelector from "../../components/ListingSelector";
import { savedListingToInitialValues } from "../../utils/savedListingFormValues";
import client from "../../api/client";

export default function ContractBuilder() {
  const navigate = useNavigate();
  const [selectedModule, setSelectedModule] = useState(CONTRACT_MODULES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initialValues, setInitialValues] = useState({});
  const [formKey, setFormKey] = useState(0);

  function handleModuleChange(e) {
    const slug = e.target.value;
    const mod = CONTRACT_MODULES.find((m) => m.slug === slug);
    setSelectedModule(mod);
    setInitialValues({});
    setFormKey((k) => k + 1);
  }

  function handleListingSelect(listing) {
    setInitialValues(savedListingToInitialValues(listing, selectedModule.fields || []));
    setFormKey((k) => k + 1);
  }

  async function handleSubmit(inputData) {
    setLoading(true);
    setError(null);
    try {
      const propTitle = inputData.address || inputData.buyer_names || selectedModule.label;
      const title = `${selectedModule.label} — ${propTitle}`;
      const contractType = selectedModule.slug === "listing-agreement" ? "listing_agreement" : "buyer_broker";

      const res = await client.post("/contracts", {
        contract_type: contractType,
        title: title,
        input_data: inputData,
      });

      navigate(`/re/contracts/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to generate contract.");
    } finally {
      setLoading(false);
    }
  }

  const hasAddressField = selectedModule.fields?.some((f) => f.name === "address");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create New Contract</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Fill in the agreement details. The AI will draft the legal narrative and generate a branded PDF.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Agreement Type
          </label>
          <select
            value={selectedModule.slug}
            onChange={handleModuleChange}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CONTRACT_MODULES.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {hasAddressField && <ListingSelector onSelect={handleListingSelect} />}
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-xl text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
        <GeneratorForm
          key={formKey}
          fields={selectedModule.fields}
          onSubmit={handleSubmit}
          loading={loading}
          submitLabel={`Generate & Draft ${selectedModule.label}`}
          initialValues={initialValues}
        />
      </div>
    </div>
  );
}
