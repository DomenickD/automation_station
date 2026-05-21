import { useState } from "react";
import GeneratorForm from "../../components/GeneratorForm";
import OutputCard from "../../components/OutputCard";
import ListingSelector from "../../components/ListingSelector";
import { useGenerate } from "../../hooks/useGenerate";
import { savedListingToInitialValues } from "../../utils/savedListingFormValues";

export default function GenericGenerator({ module }) {
  const endpoint = module.path.startsWith("/contracts/")
    ? `/generate/contracts/${module.slug}`
    : `/generate/re/${module.slug}`;
  const { generate, regenerate, loading, result, error } = useGenerate(endpoint);
  const [formKey, setFormKey] = useState(0);
  const [initialValues, setInitialValues] = useState({});

  const hasAddressField = module.fields?.some((f) => f.name === "address");

  function handleListingSelect(listing) {
    setInitialValues(savedListingToInitialValues(listing, module.fields || []));
    setFormKey((k) => k + 1);
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">{module.label}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{module.description}</p>

      {hasAddressField && <ListingSelector onSelect={handleListingSelect} />}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <GeneratorForm
          key={formKey}
          fields={module.fields}
          onSubmit={generate}
          loading={loading}
          submitLabel={`Generate ${module.label}`}
          initialValues={initialValues}
          outputSlot={result && <OutputCard output={result.output} documentId={result.document_id} onRegenerate={regenerate} loading={loading} />}
        />
      </div>
    </div>
  );
}
