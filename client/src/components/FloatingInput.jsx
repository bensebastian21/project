import React from "react";

export default function FloatingInput({
  label,
  name,
  type = "text",
  value,
  onChange,
  onBlur,
  error,
  required = false,
  accept = "",
  options = [],
}) {
  const isSelect = type === "select";
  const isFile = type === "file";

  return (
    <div className="relative w-full animate-fadeIn">
      {isSelect ? (
        <select
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          required={required}
          className={`peer input bg-transparent ${error ? "border-red-500" : ""}`}
        >
          <option value="" disabled>{label}</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : isFile ? (
        <input
          name={name}
          type="file"
          accept={accept}
          onChange={onChange}
          required={required}
          className="input file:bg-blue-600 file:text-white file:border-none file:px-4 file:py-2 file:rounded-lg"
        />
      ) : (
        <input
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          required={required}
          className={`peer input bg-transparent ${error ? "border-red-500" : ""}`}
          placeholder=" "
        />
      )}
      {!isFile && (
        <label
          htmlFor={name}
          className="absolute left-3 -top-2 text-xs px-1 bg-gray-900 dark:bg-gray-950 text-gray-300 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-2 peer-placeholder-shown:left-4 transition-all duration-200 ease-in-out"
        >
          {label}
        </label>
      )}
      {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
    </div>
  );
}
