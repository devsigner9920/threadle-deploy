/**
 * Step 5: Global Default Settings
 * Configure default translation style, language, and system settings.
 */

import React, { useState } from 'react';
import { useWizardStore } from '../../../store/wizardStore';

const Step5Settings: React.FC = () => {
  const { formData, updateFormData, clearValidationError } = useWizardStore();
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);

  const translationStyles = [
    {
      value: 'ELI5',
      label: 'ELI5 (Explain Like I\'m 5)',
      description: 'Ultra-simplified explanations with everyday analogies',
    },
    {
      value: 'Business Summary',
      label: 'Business Summary',
      description: 'Focus on business impact, skip technical details',
    },
    {
      value: 'Technical Lite',
      label: 'Technical Lite',
      description: 'Semi-technical explanations for adjacent roles',
    },
    {
      value: 'Analogies Only',
      label: 'Analogies Only',
      description: 'Explain using real-world comparisons',
    },
  ];

  const languages = [
    'English',
    'Spanish',
    'French',
    'German',
    'Japanese',
    'Korean',
    'Chinese',
  ];

  const handleStyleChange = (style: string) => {
    updateFormData({ defaultStyle: style as any });
    clearValidationError('defaultStyle');
    setSaveResult(null);
  };

  const handleLanguageChange = (language: string) => {
    updateFormData({ defaultLanguage: language });
    clearValidationError('defaultLanguage');
    setSaveResult(null);
  };

  const handleRateLimitChange = (value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 100) {
      updateFormData({ rateLimitPerMinute: numValue });
      clearValidationError('rateLimitPerMinute');
      setSaveResult(null);
    }
  };

  const handleCacheTTLChange = (value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      updateFormData({ cacheTTL: numValue });
      clearValidationError('cacheTTL');
      setSaveResult(null);
    }
  };

  const saveSettings = async () => {
    if (!formData.defaultStyle || !formData.defaultLanguage) {
      setSaveResult({
        success: false,
        message: 'Please select a translation style and language',
      });
      return;
    }

    setSaving(true);
    setSaveResult(null);

    try {
      const response = await fetch('/api/v1/setup/global-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          defaultStyle: formData.defaultStyle,
          defaultLanguage: formData.defaultLanguage,
          rateLimitPerMinute: formData.rateLimitPerMinute,
          cacheTTL: formData.cacheTTL,
        }),
      });

      if (response.ok) {
        setSaveResult({
          success: true,
          message: 'Settings saved successfully!',
        });
      } else {
        const error = await response.json();
        setSaveResult({
          success: false,
          message: error.message || 'Failed to save settings',
        });
      }
    } catch (error) {
      setSaveResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to save settings',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Global Default Settings
        </h2>
        <p className="text-gray-600">
          Configure default settings for all users. Users can override these in their profiles.
        </p>
      </div>

      {/* Translation Style */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Default Translation Style
        </label>
        <div className="space-y-3">
          {translationStyles.map((style) => (
            <label
              key={style.value}
              className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                formData.defaultStyle === style.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="translationStyle"
                value={style.value}
                checked={formData.defaultStyle === style.value}
                onChange={(e) => handleStyleChange(e.target.value)}
                className="mt-1 mr-3"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">{style.label}</div>
                <div className="text-sm text-gray-600">{style.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Default Language */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Default Language
        </label>
        <select
          value={formData.defaultLanguage}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {languages.map((language) => (
            <option key={language} value={language}>
              {language}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          The language for AI-generated explanations.
        </p>
      </div>

      {/* Rate Limiting */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rate Limit (requests per user per minute)
        </label>
        <input
          type="number"
          min="1"
          max="100"
          value={formData.rateLimitPerMinute}
          onChange={(e) => handleRateLimitChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          Prevent abuse by limiting how many requests each user can make per minute (default: 10).
        </p>
      </div>

      {/* Cache TTL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cache TTL (seconds)
        </label>
        <input
          type="number"
          min="0"
          value={formData.cacheTTL}
          onChange={(e) => handleCacheTTLChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          How long to cache translation results to reduce API costs (default: 3600 = 1 hour).
        </p>
      </div>

      {/* Save Button */}
      <div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Save Result */}
      {saveResult && (
        <div className={`p-4 rounded-lg ${
          saveResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center">
            {saveResult.success ? (
              <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className={`text-sm ${saveResult.success ? 'text-green-800' : 'text-red-800'}`}>
              {saveResult.message}
            </span>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          User Customization
        </h3>
        <p className="text-sm text-blue-800">
          These are default settings for all users. Individual users can customize their preferred
          translation style, language, and other settings through the /setprofile command or the web UI.
        </p>
      </div>
    </div>
  );
};

export default Step5Settings;
