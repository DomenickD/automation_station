import GeneratorForm from "../../components/GeneratorForm";
import OutputCard from "../../components/OutputCard";
import { useGenerate } from "../../hooks/useGenerate";

const FIELDS = [
  { name: "client_name", label: "Client Name", required: true, placeholder: "John & Mary Smith" },
  { name: "client_address", label: "Client Address", required: true, placeholder: "456 Oak Ave, Austin TX 78745" },
  { name: "work_completed", label: "Work Completed", type: "textarea", rows: 3, required: true, placeholder: "Full roof replacement — removed existing shingles, installed GAF Timberline HDZ 30-year shingles, replaced all flashing..." },
  { name: "completion_date", label: "Completion Date", type: "date", required: true },
  { name: "warranty_period", label: "Warranty Period", required: true, placeholder: "2 years from date of completion" },
  { name: "warranty_coverage", label: "What Warranty Covers", type: "textarea", rows: 2, required: true, placeholder: "Covers workmanship defects, leaks caused by installation errors. Does not cover storm damage or acts of nature." },
  { name: "emergency_contact", label: "Emergency Contact for Warranty Claims", required: true, placeholder: "Call 512-555-1234 or email service@smithroofing.com" },
  { name: "care_instructions", label: "Post-Job Care Instructions", type: "textarea", rows: 2, placeholder: "Keep gutters clear, inspect flashing annually, do not pressure-wash shingles..." },
];

export default function CompletionLetter() {
  const { generate, regenerate, loading, result, error } = useGenerate("/generate/co/completion");

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Completion & Warranty Letter</h1>
      <p className="text-sm text-gray-500 mb-6">
        Generate a formal completion letter with warranty certificate and care instructions.
      </p>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <GeneratorForm fields={FIELDS} onSubmit={generate} loading={loading} submitLabel="Generate Completion Letter" outputSlot={result && <OutputCard output={result.output} documentId={result.document_id} onRegenerate={regenerate} loading={loading} />} />
      </div>
    </div>
  );
}
