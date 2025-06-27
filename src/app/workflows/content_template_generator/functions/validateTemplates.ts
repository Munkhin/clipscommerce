import type { ContentTemplateBatch } from './schema';

/**
 * ValidationError describes a single validation issue in a content template batch.
 */
export interface ValidationError {
  batchIndex: number;
  templateIndex: number;
  message: string;
}

/**
 * Validates an array of ContentTemplateBatch for required fields and platform-specific rules.
 *
 * Platform rules:
 * - TikTok: script <= 500 chars
 * - Instagram: script <= 2200 chars, visuals required
 * - YouTube: script <= 5000 chars, audio required
 *
 * @param batches Array of ContentTemplateBatch to validate
 * @returns Array of ValidationError (empty if valid)
 */
export function validateTemplates(
  batches: ContentTemplateBatch[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  batches.forEach((batch, batchIdx) => {
    batch.templates.forEach((template, tmplIdx) => {
      // Only add one error for missing required fields
      if (!template.hook || !template.script || !template.visuals || !template.audio) {
        errors.push({
          batchIndex: batchIdx,
          templateIndex: tmplIdx,
          message: 'Missing required field(s): hook, script, visuals, or audio.',
        });
        return; // Skip further validation for this template
      }
      // TikTok: script <= 500 chars
      if (batch.platform === 'tiktok' && template.script.length > 500) {
        errors.push({
          batchIndex: batchIdx,
          templateIndex: tmplIdx,
          message: 'TikTok: Script exceeds 500 characters. Shorten your script for TikTok compliance.',
        });
      }
      // Instagram: script <= 2200 chars, visuals required
      if (batch.platform === 'instagram') {
        if (template.script.length > 2200) {
          errors.push({
            batchIndex: batchIdx,
            templateIndex: tmplIdx,
            message: 'Instagram: Script exceeds 2200 characters. Instagram captions have a 2200 character limit.',
          });
        }
        if (!template.visuals) {
          errors.push({
            batchIndex: batchIdx,
            templateIndex: tmplIdx,
            message: 'Instagram: Visuals are required for Instagram posts.',
          });
        }
      }
      // YouTube: script <= 5000 chars, audio required
      if (batch.platform === 'youtube') {
        if (template.script.length > 5000) {
          errors.push({
            batchIndex: batchIdx,
            templateIndex: tmplIdx,
            message: 'YouTube: Script exceeds 5000 characters. YouTube descriptions have a 5000 character limit.',
          });
        }
        if (!template.audio) {
          errors.push({
            batchIndex: batchIdx,
            templateIndex: tmplIdx,
            message: 'YouTube: Audio suggestions are required for YouTube videos.',
          });
        }
      }
    });
  });
  return errors;
} 