/**
 * Reusable generator form component.
 * Pass `fields` as an array of field descriptors and `onSubmit` handler.
 * Pass `initialValues` to pre-populate fields (e.g. from a saved listing).
 * Change the `formKey` prop to reset the form with new initialValues.
 */
export default function GeneratorForm({ fields, onSubmit, loading, submitLabel = "Generate", initialValues = {} }) {
  function handleSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {};
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
    onSubmit(data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((field) => (
        <div key={field.name}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>

          {field.type === "select" ? (
            <select
              name={field.name}
              defaultValue={initialValues[field.name] ?? field.defaultValue ?? ""}
              required={field.required}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {!field.required && <option value="">— Optional —</option>}
              {field.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : field.type === "textarea" ? (
            <textarea
              name={field.name}
              placeholder={field.placeholder}
              required={field.required}
              rows={field.rows || 4}
              defaultValue={initialValues[field.name] ?? ""}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <input
              type={field.type || "text"}
              name={field.name}
              placeholder={field.placeholder}
              required={field.required}
              defaultValue={initialValues[field.name] ?? field.defaultValue ?? ""}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          {field.hint && <p className="text-xs text-gray-500 mt-1">{field.hint}</p>}
        </div>
      ))}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 px-4 rounded-lg text-white font-medium text-sm disabled:opacity-60 transition-opacity"
        style={{ backgroundColor: "var(--brand-color, #2563eb)" }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Generating...
          </span>
        ) : (
          submitLabel
        )}
      </button>
    </form>
  );
}
