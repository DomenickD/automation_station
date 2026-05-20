import GeneratorForm from "../../components/GeneratorForm";
import OutputCard from "../../components/OutputCard";
import { useGenerate } from "../../hooks/useGenerate";

const FIELDS = [
  { name: "job_date", label: "Job Date", type: "date", required: true },
  { name: "address", label: "Job Address", required: true, placeholder: "789 Pine St, Austin TX" },
  { name: "client_name", label: "Client Name", required: true, placeholder: "John Smith" },
  { name: "access_notes", label: "Access Notes", placeholder: "Gate code #1234, park in driveway" },
  {
    name: "scope",
    label: "Scope Summary",
    type: "textarea",
    rows: 3,
    required: true,
    placeholder: "Replace 25 squares of shingles on main roof, install new flashing around chimney...",
  },
  { name: "materials_on_site", label: "Materials Already On Site", type: "textarea", rows: 2, placeholder: "Shingles delivered yesterday, ladder on truck" },
  { name: "materials_to_bring", label: "Materials to Bring", type: "textarea", rows: 2, placeholder: "Roofing nails, ice barrier, drip edge, underlayment" },
  { name: "instructions", label: "Special Instructions", type: "textarea", rows: 2, placeholder: "Homeowners have a dog — keep gate closed. No music after 7pm." },
  { name: "hours", label: "Expected Hours", placeholder: "6–8 hours" },
];

export default function JobBrief() {
  const { generate, regenerate, loading, result, error } = useGenerate("/generate/co/job-brief");

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Job Brief Generator</h1>
      <p className="text-sm text-gray-500 mb-6">
        Generate clean, scannable job briefs to send your crew each morning.
      </p>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <GeneratorForm fields={FIELDS} onSubmit={generate} loading={loading} submitLabel="Generate Job Brief" outputSlot={result && <OutputCard output={result.output} documentId={result.document_id} onRegenerate={regenerate} loading={loading} />} />
      </div>
    </div>
  );
}
