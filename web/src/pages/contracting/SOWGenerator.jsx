import GeneratorForm from "../../components/GeneratorForm";
import OutputCard from "../../components/OutputCard";
import { useGenerate } from "../../hooks/useGenerate";

const FIELDS = [
  {
    name: "job_type",
    label: "Job Type",
    type: "select",
    required: true,
    options: ["Roofing","HVAC","Plumbing","Electrical","General Contracting","Landscaping","Painting","Flooring","Remodeling","Other"].map((v) => ({ value: v, label: v })),
  },
  {
    name: "description",
    label: "Detailed Task Description",
    type: "textarea",
    rows: 5,
    required: true,
    placeholder: "Describe every task in detail — what will be done, how, to what spec...",
  },
  {
    name: "exclusions",
    label: "Exclusions (What is NOT included)",
    type: "textarea",
    rows: 3,
    placeholder: "Does not include electrical work, permits, or debris removal beyond job site...",
  },
  {
    name: "site_conditions",
    label: "Site Conditions / Access Notes",
    type: "textarea",
    rows: 2,
    placeholder: "Single-story home, easy access, no HOA restrictions...",
  },
  {
    name: "requirements",
    label: "Special Requirements",
    type: "textarea",
    rows: 2,
    placeholder: "Must use manufacturer-approved materials, match existing trim color...",
  },
];

export default function SOWGenerator() {
  const { generate, regenerate, loading, result, error } = useGenerate("/generate/co/sow");

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Scope of Work Generator</h1>
      <p className="text-sm text-gray-500 mb-6">
        Create detailed SOW documents with numbered tasks, exclusions, and change order language.
      </p>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {result && (
        <OutputCard output={result.output} documentId={result.document_id} onRegenerate={regenerate} loading={loading} />
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <GeneratorForm fields={FIELDS} onSubmit={generate} loading={loading} submitLabel="Generate SOW" />
      </div>
    </div>
  );
}
