import GeneratorForm from "../../components/GeneratorForm";
import OutputCard from "../../components/OutputCard";
import { useGenerate } from "../../hooks/useGenerate";

export default function GenericGenerator({ module }) {
  const endpoint = module.path.startsWith("/contracts/")
    ? `/generate/contracts/${module.slug}`
    : `/generate/re/${module.slug}`;
  const { generate, regenerate, loading, result, error } = useGenerate(endpoint);

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">{module.label}</h1>
      <p className="text-sm text-gray-500 mb-6">{module.description}</p>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {result && (
        <OutputCard
          output={result.output}
          documentId={result.document_id}
          onRegenerate={regenerate}
          loading={loading}
        />
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <GeneratorForm
          fields={module.fields}
          onSubmit={generate}
          loading={loading}
          submitLabel={`Generate ${module.label}`}
        />
      </div>
    </div>
  );
}
