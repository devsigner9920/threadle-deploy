/**
 * Setup Wizard Page
 * Main wizard component that orchestrates the 6-step setup process.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWizardStore } from '../store/wizardStore';
import WizardLayout from '../components/wizard/WizardLayout';
import { completeSetup } from '../api/setupApi';

// Import wizard step components
import Step1Welcome from '../components/wizard/steps/Step1Welcome';
import Step2AIProvider from '../components/wizard/steps/Step2AIProvider';
import Step3SlackSetup from '../components/wizard/steps/Step3SlackSetup';
import Step4OAuth from '../components/wizard/steps/Step4OAuth';
import Step5Settings from '../components/wizard/steps/Step5Settings';
import Step6Complete from '../components/wizard/steps/Step6Complete';

const SetupWizard: React.FC = () => {
  const navigate = useNavigate();
  const { currentStep, nextStep, previousStep, isStepValid, formData, setSubmitting } = useWizardStore();
  const [error, setError] = useState<string | null>(null);

  const handleNext = async () => {
    setError(null);

    // If this is the last step, complete the setup
    if (currentStep === 6) {
      try {
        setSubmitting(true);

        // Call the completion API
        await completeSetup({
          llmProvider: formData.llmProvider,
          slackAppId: formData.slackAppId,
          slackClientId: formData.slackClientId,
          slackWorkspaceId: formData.slackWorkspaceId,
          defaultStyle: formData.defaultStyle,
          defaultLanguage: formData.defaultLanguage,
          rateLimitPerMinute: formData.rateLimitPerMinute,
          cacheTTL: formData.cacheTTL,
        });

        // Redirect to dashboard on success
        navigate('/dashboard', { replace: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to complete setup');
        setSubmitting(false);
      }
    } else {
      // Move to next step
      nextStep();
    }
  };

  const handleBack = () => {
    setError(null);
    previousStep();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Welcome />;
      case 2:
        return <Step2AIProvider />;
      case 3:
        return <Step3SlackSetup />;
      case 4:
        return <Step4OAuth />;
      case 5:
        return <Step5Settings />;
      case 6:
        return <Step6Complete />;
      default:
        return <Step1Welcome />;
    }
  };

  const canProceed = isStepValid(currentStep) || currentStep === 1;
  const isLastStep = currentStep === 6;

  return (
    <WizardLayout
      onNext={handleNext}
      onBack={handleBack}
      canGoNext={canProceed}
      canGoBack={currentStep > 1}
      nextLabel={isLastStep ? 'Complete Setup' : 'Next'}
    >
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <svg
              className="h-5 w-5 text-red-600 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm text-red-800">{error}</span>
          </div>
        </div>
      )}
      {renderStep()}
    </WizardLayout>
  );
};

export default SetupWizard;
