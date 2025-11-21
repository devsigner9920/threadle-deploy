/**
 * Translation Service Types
 * Type definitions for translation and prompt building
 */

export interface ConversationMessage {
  user: string;
  text: string;
}

export interface UserProfile {
  role: string;
  language: string;
  customInstructions: string | null;
  preferredStyle: string | null;
}

export interface TranslationResult {
  content: string;
  tokenUsage: number;
  provider: string;
  model: string;
}

export interface RedactionResult {
  text: string;
  redactions: Redaction[];
}

export interface Redaction {
  type: 'email' | 'phone' | 'token' | 'ssn' | 'credit_card';
  original: string;
  position: number;
}

export type TranslationStyle = 'ELI5' | 'Business Summary' | 'Technical Lite' | 'Analogies Only';

export const TRANSLATION_STYLES: TranslationStyle[] = [
  'ELI5',
  'Business Summary',
  'Technical Lite',
  'Analogies Only',
];

export const ROLE_TEMPLATE_MAP: Record<string, string> = {
  'Engineering-Backend': 'engineering-backend',
  'Engineering-Frontend': 'engineering-frontend',
  'Engineering-Mobile': 'engineering-frontend', // Use frontend template for mobile
  'Design': 'design',
  'Product': 'product',
  'Marketing': 'marketing',
  'QA': 'engineering-backend', // Use backend template for QA
  'Data': 'engineering-backend', // Use backend template for Data
};

export const AI_DISCLAIMER = 'Note: This explanation was AI-generated. Please verify important details.';
