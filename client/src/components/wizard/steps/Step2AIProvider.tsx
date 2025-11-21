/**
 * Step 2: AI Provider Configuration
 * Allows user to select LLM provider, enter API key, and test connection.
 */

import React, { useState } from 'react';
import { useWizardStore } from '../../../store/wizardStore';

const Step2AIProvider: React.FC = () => {
  const { formData, updateFormData, clearValidationError } = useWizardStore();
  const [showApiKey, setShowApiKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const providers = [
    { value: 'openai', label: 'OpenAI (GPT-4)', models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
    { value: 'anthropic', label: 'Anthropic (Claude)', models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'] },
    { value: 'google', label: 'Google (Gemini)', models: ['gemini-1.5-pro', 'gemini-1.5-flash'] },
  ];

  const selectedProvider = providers.find(p => p.value === formData.llmProvider);

  const handleProviderChange = (provider: string) => {
    updateFormData({ llmProvider: provider as any });
    clearValidationError('llmProvider');

    // Set default model for provider
    const providerConfig = providers.find(p => p.value === provider);
    if (providerConfig) {
      updateFormData({ llmModel: providerConfig.models[0] });
    }
  };

  const handleApiKeyChange = (apiKey: string) => {
    updateFormData({ llmApiKey: apiKey });
    clearValidationError('llmApiKey');
    setTestResult(null);
  };

  const handleModelChange = (model: string) => {
    updateFormData({ llmModel: model });
    clearValidationError('llmModel');
  };

  const testConnection = async () => {
    if (!formData.llmProvider || !formData.llmApiKey || !formData.llmModel) {
      setTestResult({
        success: false,
        message: 'Please select a provider, enter an API key, and select a model',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/v1/setup/llm-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: formData.llmProvider,
          apiKey: formData.llmApiKey,
          model: formData.llmModel,
        }),
      });

      if (response.ok) {
        setTestResult({
          success: true,
          message: 'API key validated and saved successfully!',
        });
      } else {
        const error = await response.json();
        setTestResult({
          success: false,
          message: error.message || 'Failed to validate API key',
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          AI Provider Configuration
        </h2>
        <p className="text-gray-600">
          Choose your preferred LLM provider and configure your API key.
        </p>
      </div>

      {/* Provider Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          LLM Provider
        </label>
        <select
          value={formData.llmProvider}
          onChange={(e) => handleProviderChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a provider...</option>
          {providers.map((provider) => (
            <option key={provider.value} value={provider.value}>
              {provider.label}
            </option>
          ))}
        </select>
      </div>

      {/* Model Selection */}
      {selectedProvider && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Model
          </label>
          <select
            value={formData.llmModel}
            onChange={(e) => handleModelChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {selectedProvider.models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* API Key Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          API Key
        </label>
        <div className="relative">
          <input
            type={showApiKey ? 'text' : 'password'}
            value={formData.llmApiKey}
            onChange={(e) => handleApiKeyChange(e.target.value)}
            placeholder={`Enter your ${selectedProvider?.label || 'API'} key...`}
            className="w-full px-3 py-2 pr-24 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
          >
            {showApiKey ? 'Hide' : 'Show'}
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Your API key will be encrypted and stored securely.
        </p>
      </div>

      {/* Test Connection Button */}
      <div>
        <button
          onClick={testConnection}
          disabled={testing || !formData.llmProvider || !formData.llmApiKey || !formData.llmModel}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {testing ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Testing Connection...
            </span>
          ) : (
            'Test Connection'
          )}
        </button>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={`p-4 rounded-lg ${
          testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center">
            {testResult.success ? (
              <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className={`text-sm ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
              {testResult.message}
            </span>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">
          Where to get your API key:
        </h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>
            <strong>OpenAI:</strong>{' '}
            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              platform.openai.com/api-keys
            </a>
          </li>
          <li>
            <strong>Anthropic:</strong>{' '}
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              console.anthropic.com/settings/keys
            </a>
          </li>
          <li>
            <strong>Google:</strong>{' '}
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              aistudio.google.com/app/apikey
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Step2AIProvider;
