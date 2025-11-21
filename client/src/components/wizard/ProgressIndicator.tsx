/**
 * Progress Indicator Component
 * Shows the current step and overall progress through the wizard.
 */

import React from 'react';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const stepLabels = [
  'Welcome',
  'AI Provider',
  'Slack Setup',
  'OAuth',
  'Settings',
  'Admin',
];

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
}) => {
  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className="w-full">
      {/* Progress Bar */}
      <div className="relative mb-6">
        <div className="overflow-hidden h-2 text-xs flex rounded-full bg-gray-200">
          <div
            style={{ width: `${progressPercentage}%` }}
            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600 transition-all duration-300"
          ></div>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="flex justify-between items-center">
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <div key={stepNumber} className="flex flex-col items-center flex-1">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold
                  transition-all duration-200
                  ${
                    isCompleted
                      ? 'bg-blue-600 text-white'
                      : isCurrent
                      ? 'bg-blue-600 text-white ring-4 ring-blue-200'
                      : 'bg-gray-200 text-gray-600'
                  }
                `}
              >
                {isCompleted ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  stepNumber
                )}
              </div>
              <span
                className={`
                  mt-2 text-xs font-medium text-center
                  ${isCurrent ? 'text-blue-600' : 'text-gray-600'}
                `}
              >
                {stepLabels[index]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Current Step Info */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Step {currentStep} of {totalSteps}
        </p>
      </div>
    </div>
  );
};

export default ProgressIndicator;
