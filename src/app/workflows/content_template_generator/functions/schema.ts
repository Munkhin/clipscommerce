export interface ContentTemplate {
  hook: string;
  script: string;
  visuals: string;
  audio: string;
}

export interface ContentTemplateBatch {
  templates: ContentTemplate[];
  productDescription: string;
  platform: string;
} 