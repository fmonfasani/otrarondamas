/**
 * Form Submit Button Component
 * Handles loading state and disabled state
 */

interface FormButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  isLoading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export default function FormButton({
  label,
  isLoading = false,
  disabled = false,
  variant = 'primary',
  className = '',
  ...props
}: FormButtonProps) {
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`px-6 py-2.5 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
        variantClasses[variant]
      } ${className}`}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      ) : (
        label
      )}
    </button>
  );
}
