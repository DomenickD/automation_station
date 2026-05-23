/**
 * Reusable generator form component.
 * Pass `fields` as an array of field descriptors and `onSubmit` handler.
 * Pass `initialValues` to pre-populate fields (e.g. from a saved listing).
 * Change the `formKey` prop to reset the form with new initialValues.
 */
import { useState } from "react";
import { Icon } from "@iconify/react";
import AddressSearch from "./AddressSearch";
import Stepper from "./Stepper";
import ChipSelect from "./ChipSelect";

const TIMELINE_AUTO_DATE_FIELDS = [
  "inspection_end",
  "appraisal_date",
  "loan_commitment",
  "walkthrough_date",
  "closing_date",
  "closing_disclosure_due",
];

// Fields whose name ends with "address" and have no explicit type get address autocomplete
function isAddressField(field) {
  return (field.name === "address" || field.name.endsWith("_address")) && !field.type;
}

function parseDateOnly(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatDateOnly(date) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addCalendarDays(value, days) {
  const date = parseDateOnly(value);
  if (!date) return "";
  date.setDate(date.getDate() + days);
  return formatDateOnly(date);
}

function addDisclosureBusinessDays(value, days) {
  const date = parseDateOnly(value);
  if (!date) return "";
  const direction = days < 0 ? -1 : 1;
  let remaining = Math.abs(days);

  while (remaining > 0) {
    date.setDate(date.getDate() + direction);
    // CFPB timing treats all days except Sundays and federal holidays as
    // business days. Holidays still need user review.
    if (date.getDay() !== 0) remaining -= 1;
  }

  return formatDateOnly(date);
}

function calculateTimelineDates(contractDate) {
  const closingDate = addCalendarDays(contractDate, 30);
  return {
    inspection_end: addCalendarDays(contractDate, 10),
    appraisal_date: addCalendarDays(contractDate, 21),
    loan_commitment: addCalendarDays(contractDate, 25),
    walkthrough_date: addCalendarDays(closingDate, -1),
    closing_date: closingDate,
    closing_disclosure_due: addDisclosureBusinessDays(closingDate, -3),
  };
}

function calculateClosingBasedDates(closingDate) {
  return {
    walkthrough_date: addCalendarDays(closingDate, -1),
    closing_disclosure_due: addDisclosureBusinessDays(closingDate, -3),
  };
}

export default function GeneratorForm({ fields, onSubmit, loading, submitLabel = "Generate", initialValues = {}, outputSlot }) {
  const [addressValues, setAddressValues] = useState(() => {
    const vals = {};
    fields.forEach((f) => {
      if (isAddressField(f)) vals[f.name] = initialValues[f.name] ?? f.defaultValue ?? "";
    });
    return vals;
  });

  const [stepperValues, setStepperValues] = useState(() => {
    const vals = {};
    fields.forEach((f) => {
      if (f.type === "stepper") vals[f.name] = initialValues[f.name] ?? f.defaultValue ?? "";
    });
    return vals;
  });

  const [chipsValues, setChipsValues] = useState(() => {
    const vals = {};
    fields.forEach((f) => {
      if (f.type === "chips") vals[f.name] = initialValues[f.name] ?? f.defaultValue ?? "";
    });
    return vals;
  });

  const [dateValues, setDateValues] = useState(() => {
    const vals = {};
    fields.forEach((f) => {
      if (f.type === "date") vals[f.name] = initialValues[f.name] ?? f.defaultValue ?? "";
    });
    return vals;
  });
  const [manualDateFields, setManualDateFields] = useState(() => new Set());

  function handleSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {};
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
    onSubmit(data);
  }

  function handleDateChange(fieldName, value) {
    setDateValues((prev) => {
      const next = { ...prev, [fieldName]: value };

      if (fieldName === "contract_date") {
        const calculated = calculateTimelineDates(value);
        TIMELINE_AUTO_DATE_FIELDS.forEach((name) => {
          if (!manualDateFields.has(name)) next[name] = calculated[name] || "";
        });
      } else if (fieldName === "closing_date") {
        const calculated = calculateClosingBasedDates(value);
        ["walkthrough_date", "closing_disclosure_due"].forEach((name) => {
          if (!manualDateFields.has(name)) next[name] = calculated[name] || "";
        });
      }

      return next;
    });

    if (fieldName !== "contract_date") {
      setManualDateFields((prev) => new Set(prev).add(fieldName));
    }
  }

  // Group consecutive fields that share the same `group` key into rows
  const fieldRows = [];
  fields.forEach((field) => {
    if (field.group) {
      const last = fieldRows[fieldRows.length - 1];
      if (last?.group === field.group) {
        last.fields.push(field);
      } else {
        fieldRows.push({ group: field.group, fields: [field] });
      }
    } else {
      fieldRows.push({ group: null, fields: [field] });
    }
  });

  function renderFieldInput(field) {
    const inputCls = "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
    if (isAddressField(field)) {
      return (
        <>
          <AddressSearch
            value={addressValues[field.name] ?? ""}
            onChange={(val) => setAddressValues((prev) => ({ ...prev, [field.name]: val }))}
            placeholder={field.placeholder}
            required={field.required}
          />
          <input type="hidden" name={field.name} value={addressValues[field.name] ?? ""} />
        </>
      );
    }
    if (field.type === "stepper") {
      return (
        <>
          <Stepper
            value={stepperValues[field.name] ?? ""}
            min={field.min}
            max={field.max}
            step={field.step}
            onChange={(val) => setStepperValues((prev) => ({ ...prev, [field.name]: val }))}
          />
          <input type="hidden" name={field.name} value={stepperValues[field.name] ?? ""} />
        </>
      );
    }
    if (field.type === "chips") {
      return (
        <>
          <ChipSelect
            options={field.options ?? []}
            value={chipsValues[field.name] ?? ""}
            onChange={(val) => setChipsValues((prev) => ({ ...prev, [field.name]: val }))}
            placeholder={field.placeholder}
          />
          <input type="hidden" name={field.name} value={chipsValues[field.name] ?? ""} />
        </>
      );
    }
    if (field.type === "date") {
      return (
        <input
          type="date"
          name={field.name}
          required={field.required}
          value={dateValues[field.name] ?? ""}
          onChange={(e) => handleDateChange(field.name, e.target.value)}
          className={inputCls}
        />
      );
    }
    if (field.type === "select") {
      return (
        <select
          name={field.name}
          defaultValue={initialValues[field.name] ?? field.defaultValue ?? ""}
          required={field.required}
          className={inputCls}
        >
          {!field.required && <option value="">— Optional —</option>}
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }
    if (field.type === "textarea") {
      return (
        <textarea
          name={field.name}
          placeholder={field.placeholder}
          required={field.required}
          rows={field.rows || 4}
          defaultValue={initialValues[field.name] ?? ""}
          className={inputCls}
        />
      );
    }
    if (field.type === "combobox") {
      return (
        <>
          <input
            type="text"
            list={`${field.name}-datalist`}
            name={field.name}
            placeholder={field.placeholder}
            required={field.required}
            defaultValue={initialValues[field.name] ?? field.defaultValue ?? ""}
            className={inputCls}
          />
          <datalist id={`${field.name}-datalist`}>
            {(field.options || []).map((opt) => {
              const optVal = typeof opt === "string" ? opt : opt.value;
              const optLabel = typeof opt === "string" ? opt : opt.label;
              return <option key={optVal} value={optVal}>{optLabel}</option>;
            })}
          </datalist>
        </>
      );
    }
    return (
      <input
        type={field.type || "text"}
        name={field.name}
        placeholder={field.placeholder}
        required={field.required}
        defaultValue={initialValues[field.name] ?? field.defaultValue ?? ""}
        className={inputCls}
      />
    );
  }

  function renderField(field) {
    return (
      <div key={field.name}>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {renderFieldInput(field)}
        {field.hint && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{field.hint}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fieldRows.map((row) =>
        row.group ? (
          <div key={row.group} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${row.fields.length}, minmax(0, 1fr))` }}>
            {row.fields.map((field) => renderField(field))}
          </div>
        ) : (
          renderField(row.fields[0])
        )
      )}

      {outputSlot}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 px-4 rounded-lg text-white font-medium text-sm disabled:opacity-60 transition-opacity"
        style={{ backgroundColor: "var(--brand-color, #2563eb)" }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Icon icon="svg-spinners:ring-resize" className="h-4 w-4" />
            Generating...
          </span>
        ) : (
          submitLabel
        )}
      </button>
    </form>
  );
}
