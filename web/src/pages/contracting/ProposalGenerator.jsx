import GeneratorForm from "../../components/GeneratorForm";
import OutputCard from "../../components/OutputCard";
import { useGenerate } from "../../hooks/useGenerate";

const JOB_TYPES = [
  "Roofing", "HVAC", "Plumbing", "Electrical", "General Contracting",
  "Landscaping", "Painting", "Flooring", "Remodeling", "Drywall",
  "Concrete", "Framing", "Insulation", "Windows & Doors", "Other",
].map((v) => ({ value: v, label: v }));

const FIELDS = [
  { name: "client_name", label: "Client Name", required: true, placeholder: "John & Mary Smith" },
  { name: "client_address", label: "Job Address", required: true, placeholder: "456 Oak Ave, Austin TX 78745" },
  { name: "job_type", label: "Job Type", type: "select", required: true, options: JOB_TYPES },
  {
    name: "scope",
    label: "Scope Description",
    type: "textarea",
    rows: 4,
    required: true,
    placeholder: "Full roof replacement, remove and dispose of existing shingles, install 30-year architectural shingles, replace flashing...",
  },
  { name: "materials", label: "Materials List", type: "textarea", rows: 2, placeholder: "GAF Timberline HDZ shingles, 15 squares, ice barrier, drip edge..." },
  { name: "labor", label: "Labor Estimate", required: true, placeholder: "$4,500 labor" },
  { name: "timeline", label: "Timeline", required: true, placeholder: "1–2 days, scheduled for June 15–16" },
  { name: "payment_terms", label: "Payment Terms", required: true, placeholder: "50% deposit, 50% on completion" },
  { name: "warranty", label: "Warranty Terms", placeholder: "2-year workmanship warranty" },
  { name: "license_num", label: "Contractor License #", placeholder: "TX-CON-12345" },
  { name: "insurance", label: "Insurance Info", placeholder: "General liability $1M, workers comp in force" },
  { name: "notes", label: "Additional Notes", type: "textarea", rows: 2, placeholder: "Any special terms or context..." },
];

export default function ProposalGenerator() {
  const { generate, regenerate, loading, result, error } = useGenerate("/generate/co/proposal");

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Proposal Writer</h1>
      <p className="text-sm text-gray-500 mb-6">
        Generate a complete branded proposal with scope, pricing, terms, and signature block.
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
        <GeneratorForm fields={FIELDS} onSubmit={generate} loading={loading} submitLabel="Generate Proposal" />
      </div>
    </div>
  );
}
