/**
 * Reusable Form Field Component
 * Text input with validation error display
 */

interface FormFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export default function FormField({
  label,
  error,
  name,
  required = false,
  ...props
}: FormFieldProps) {
  return (
    <div>
      <label
        htmlFor={name}
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </label>
      <input
        id={name}
        name={name}
        {...props}
        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
          error
            ? 'border-red-600 bg-red-50'
            : 'border-gray-300'
        }`}
      />
      {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
    </div>
  );
}
