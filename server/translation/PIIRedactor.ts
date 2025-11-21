/**
 * PIIRedactor - Redacts personally identifiable information from text
 */

import { RedactionResult, Redaction } from './types.js';

/**
 * PIIRedactor class - detects and redacts PII from text
 */
export class PIIRedactor {
  private emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  private phoneRegex = /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
  // Improved token regex to match common API key patterns
  private tokenRegex = /\b(sk|pk|api|token|key)[-_]?(live|test)?[-_]?[A-Za-z0-9]{20,}\b/gi;
  private ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
  private creditCardRegex = /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g;

  private redactionPlaceholder = '[REDACTED]';

  /**
   * Redact PII from text
   * @param text - Input text that may contain PII
   * @returns Redacted text and list of redactions made
   */
  redact(text: string): RedactionResult {
    const redactions: Redaction[] = [];
    let redactedText = text;

    // Redact emails
    redactedText = this.redactPattern(
      redactedText,
      this.emailRegex,
      'email',
      redactions
    );

    // Redact phone numbers
    redactedText = this.redactPattern(
      redactedText,
      this.phoneRegex,
      'phone',
      redactions
    );

    // Redact SSNs
    redactedText = this.redactPattern(
      redactedText,
      this.ssnRegex,
      'ssn',
      redactions
    );

    // Redact credit cards
    redactedText = this.redactPattern(
      redactedText,
      this.creditCardRegex,
      'credit_card',
      redactions
    );

    // Redact tokens/API keys (do this last as it's most general)
    redactedText = this.redactPattern(
      redactedText,
      this.tokenRegex,
      'token',
      redactions
    );

    return {
      text: redactedText,
      redactions,
    };
  }

  /**
   * Redact a specific pattern from text
   * @param text - Input text
   * @param regex - Regular expression pattern to match
   * @param type - Type of PII being redacted
   * @param redactions - Array to collect redaction records
   * @returns Redacted text
   * @private
   */
  private redactPattern(
    text: string,
    regex: RegExp,
    type: Redaction['type'],
    redactions: Redaction[]
  ): string {
    let result = text;
    const matches: RegExpExecArray[] = [];
    let match: RegExpExecArray | null;

    // Reset regex lastIndex
    regex.lastIndex = 0;

    // Collect all matches first
    while ((match = regex.exec(text)) !== null) {
      matches.push(match);
    }

    // Replace all matches with placeholder
    matches.forEach((m) => {
      const original = m[0];
      const position = m.index;

      // Record the redaction
      redactions.push({
        type,
        original,
        position,
      });

      // Replace with placeholder
      result = result.replace(original, this.redactionPlaceholder);
    });

    return result;
  }

  /**
   * Log redaction event for auditing
   * @param redactions - List of redactions made
   */
  logRedactions(redactions: Redaction[]): void {
    if (redactions.length > 0) {
      console.log(`[PIIRedactor] Redacted ${redactions.length} PII item(s):`, {
        types: redactions.map((r) => r.type),
        count: redactions.length,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
