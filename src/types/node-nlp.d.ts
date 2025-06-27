// Type definitions for node-nlp
// Project: https://github.com/axa-group/nlp.js

declare module 'node-nlp' {
  export interface NlpManagerOptions {
    languages?: string[];
    forceNER?: boolean;
    nlu?: {
      log?: boolean;
    };
    autoSave?: boolean;
    modelFileName?: string;
  }

  export interface Token {
    stem: string;
    // Add other token properties as needed
  }

  export interface ProcessResult {
    intent: string;
    score: number;
    answer?: string;
    entities: Array<{
      entity: string;
      sourceText: string;
      // Add other entity properties as needed
    }>;
    tokens: Token[];
    // Add other result properties as needed
  }

  export class NlpManager {
    constructor(settings?: NlpManagerOptions);
    process(language: string, text: string): Promise<ProcessResult>;
    addLanguage(language: string): void;
    // Add other method declarations as needed
  }
}
