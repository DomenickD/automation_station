import GeneratorForm from "../../components/GeneratorForm";
import OutputCard from "../../components/OutputCard";
import { useGenerate } from "../../hooks/useGenerate";

const EMAIL_TYPES = [
  { value: "initial_inquiry", label: "Initial Inquiry Response" },
  { value: "estimate_ready", label: "Estimate Ready Notification" },
  { value: "job_scheduled", label: "Job Scheduled Confirmation" },
  { value: "job_start_reminder", label: "Job Start Day Reminder" },
  { value: "mid_job_update", label: "Mid-Job Status Update" },
  { value: "job_completion", label: "Job Completion Summary" },
  { value: "invoice_reminder_soft", label: "Invoice Reminder (Soft)" },
  { value: "invoice_reminder_firm", label: "Invoice Reminder (Firm)" },
  { value: "review_request", label: "Review Request (Google/Yelp)" },
  { value: "referral_ask", label: "Referral Ask" },
];

const FIELDS = [
  { name: "email_type", label: "Email Type", type: "select", required: true, options: EMAIL_TYPES },
  { name: "company_name", label: "Company Name", required: true, placeholder: "Smith Roofing & Construction" },
  { name: "client_name", label: "Client Name", required: true, placeholder: "John Smith" },
  { name: "job_description", label: "Job Type / Description", placeholder: "Full roof replacement, 3,200 sqft" },
  {
    name: "context",
    label: "Key Context / Details",
    type: "textarea",
    rows: 3,
    required: true,
    placeholder: "What's the relevant context for this email?",
  },
  { name: "notes", label: "Additional Instructions", type: "textarea", rows: 2, placeholder: "Include Google review link: https://..." },
];

export default function COEmailDrafter() {
  const { generate, regenerate, loading, result, error } = useGenerate("/generate/co/email");

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Email Drafter</h1>
      <p className="text-sm text-gray-500 mb-6">
        Professional customer communications for every stage of the job lifecycle.
      </p>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <GeneratorForm fields={FIELDS} onSubmit={generate} loading={loading} outputSlot={result && <OutputCard output={result.output} documentId={result.document_id} onRegenerate={regenerate} loading={loading} />} />
      </div>
    </div>
  );
}
