'use client';

interface Step {
  id: string;
  label: string;
}

interface CheckoutProgressProps {
  currentStep: number;
  steps: Step[];
}

/**
 * Visual progress indicator for checkout
 * - Shows completed steps (checkmark)
 * - Current step (highlighted)
 * - Future steps (disabled)
 * - Responsive design
 */
export default function CheckoutProgress({ currentStep, steps }: CheckoutProgressProps) {
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center flex-1">
          {/* Step Circle */}
          <div className="flex items-center">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm transition ${
                index < currentStep
                  ? 'bg-green-500 text-white'
                  : index === currentStep
                    ? 'bg-[#D97757] text-white'
                    : 'bg-gray-200 text-gray-600'
              }`}
            >
              {index < currentStep ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                index + 1
              )}
            </div>

            {/* Step Label - Hidden on mobile */}
            <span
              className={`ml-2 text-sm font-medium hidden sm:inline transition ${
                index <= currentStep ? 'text-gray-900' : 'text-gray-500'
              }`}
            >
              {step.label}
            </span>
          </div>

          {/* Line Connector */}
          {index < steps.length - 1 && (
            <div
              className={`flex-1 h-1 mx-4 transition ${
                index < currentStep ? 'bg-green-500' : 'bg-gray-200'
              }`}
            ></div>
          )}
        </div>
      ))}
    </div>
  );
}
