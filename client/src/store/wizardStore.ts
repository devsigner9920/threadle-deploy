/**
 * Setup Wizard State Management
 * Uses Zustand for managing wizard state including current step,
 * form data, validation errors, and progress persistence.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WizardFormData {
  // Step 2: AI Provider Configuration
  llmProvider: 'openai' | 'anthropic' | 'google' | '';
  llmApiKey: string;
  llmModel: string;

  // Step 3: Slack App Setup
  slackAppId: string;
  slackClientId: string;
  slackClientSecret: string;
  slackSigningSecret: string;

  // Step 4: OAuth (tracked separately)
  slackOAuthCompleted: boolean;
  slackBotToken: string;
  slackWorkspaceId: string;
  slackWorkspaceName: string;

  // Step 5: Global Default Settings
  defaultStyle: 'ELI5' | 'Business Summary' | 'Technical Lite' | 'Analogies Only' | '';
  defaultLanguage: string;
  rateLimitPerMinute: number;
  cacheTTL: number;

  // Step 6: Admin Account
  adminSlackUserId: string;
}

export interface WizardValidationErrors {
  [key: string]: string | undefined;
}

export interface WizardStore {
  // State
  currentStep: number;
  formData: WizardFormData;
  validationErrors: WizardValidationErrors;
  isSubmitting: boolean;

  // Actions
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  updateFormData: (data: Partial<WizardFormData>) => void;
  setValidationErrors: (errors: WizardValidationErrors) => void;
  clearValidationError: (field: string) => void;
  setSubmitting: (isSubmitting: boolean) => void;
  resetWizard: () => void;
  isStepValid: (step: number) => boolean;
}

const initialFormData: WizardFormData = {
  llmProvider: '',
  llmApiKey: '',
  llmModel: '',
  slackAppId: '',
  slackClientId: '',
  slackClientSecret: '',
  slackSigningSecret: '',
  slackOAuthCompleted: false,
  slackBotToken: '',
  slackWorkspaceId: '',
  slackWorkspaceName: '',
  defaultStyle: '',
  defaultLanguage: 'English',
  rateLimitPerMinute: 10,
  cacheTTL: 3600,
  adminSlackUserId: '',
};

export const useWizardStore = create<WizardStore>()(
  persist(
    (set, get) => ({
      currentStep: 1,
      formData: initialFormData,
      validationErrors: {},
      isSubmitting: false,

      setCurrentStep: (step: number) => {
        if (step >= 1 && step <= 6) {
          set({ currentStep: step });
        }
      },

      nextStep: () => {
        const { currentStep } = get();
        if (currentStep < 6) {
          set({ currentStep: currentStep + 1 });
        }
      },

      previousStep: () => {
        const { currentStep } = get();
        if (currentStep > 1) {
          set({ currentStep: currentStep - 1 });
        }
      },

      updateFormData: (data: Partial<WizardFormData>) => {
        set((state) => ({
          formData: { ...state.formData, ...data },
        }));
      },

      setValidationErrors: (errors: WizardValidationErrors) => {
        set({ validationErrors: errors });
      },

      clearValidationError: (field: string) => {
        set((state) => {
          const newErrors = { ...state.validationErrors };
          delete newErrors[field];
          return { validationErrors: newErrors };
        });
      },

      setSubmitting: (isSubmitting: boolean) => {
        set({ isSubmitting });
      },

      resetWizard: () => {
        set({
          currentStep: 1,
          formData: initialFormData,
          validationErrors: {},
          isSubmitting: false,
        });
      },

      isStepValid: (step: number): boolean => {
        const { formData } = get();

        switch (step) {
          case 1: // Welcome - always valid
            return true;

          case 2: // AI Provider Configuration
            return (
              !!formData.llmProvider &&
              !!formData.llmApiKey &&
              !!formData.llmModel
            );

          case 3: // Slack App Setup
            return (
              !!formData.slackAppId &&
              !!formData.slackClientId &&
              !!formData.slackClientSecret &&
              !!formData.slackSigningSecret
            );

          case 4: // OAuth
            return formData.slackOAuthCompleted;

          case 5: // Global Settings
            return (
              !!formData.defaultStyle &&
              !!formData.defaultLanguage &&
              formData.rateLimitPerMinute > 0 &&
              formData.cacheTTL >= 0
            );

          case 6: // Admin Account
            return !!formData.adminSlackUserId;

          default:
            return false;
        }
      },
    }),
    {
      name: 'threadle-wizard-storage',
      partialize: (state) => ({
        currentStep: state.currentStep,
        formData: state.formData,
      }),
    }
  )
);
