/**
 * Wizard Layout Component
 * Provides the base layout for the setup wizard including
 * progress indicator, step navigation, and form wrapper.
 */

import React from 'react';
import { useWizardStore } from '../../store/wizardStore';
import ProgressIndicator from './ProgressIndicator';

interface WizardLayoutProps {
  children: React.ReactNode;
  onNext?: () => void | Promise<void>;
  onBack?: () => void;
  nextLabel?: string;
  backLabel?: string;
  canGoNext?: boolean;
  canGoBack?: boolean;
  isLoading?: boolean;
}

const WizardLayout: React.FC<WizardLayoutProps> = ({
  children,
  onNext,
  onBack,
  nextLabel = 'Next',
  backLabel = 'Back',
  canGoNext = true,
  canGoBack = true,
  isLoading = false,
}) => {
  const { currentStep, isSubmitting } = useWizardStore();

  const handleNext = async () => {
    if (onNext && !isLoading && !isSubmitting) {
      await onNext();
    }
  };

  const handleBack = () => {
    if (onBack && !isLoading && !isSubmitting) {
      onBack();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Progress Indicator */}
        <div className="mb-8">
          <ProgressIndicator currentStep={currentStep} totalSteps={6} />
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-lg shadow-xl p-8 md:p-12">
          {/* Step Content */}
          <div className="mb-8">{children}</div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200">
            <button
              onClick={handleBack}
              disabled={!canGoBack || currentStep === 1 || isSubmitting || isLoading}
              className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {backLabel}
            </button>

            <div className="flex items-center space-x-3">
              {isSubmitting && (
                <div className="flex items-center text-sm text-gray-600">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </div>
              )}

              <button
                onClick={handleNext}
                disabled={!canGoNext || isSubmitting || isLoading}
                className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting || isLoading ? 'Processing...' : nextLabel}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Need help?{' '}
            <a
              href="https://github.com/threadle/threadle#readme"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              View Documentation
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default WizardLayout;
