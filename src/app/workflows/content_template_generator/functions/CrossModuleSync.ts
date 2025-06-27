export class CrossModuleSync {
  static feedCompetitorTacticsToPrompt(hooks: string[]): string {
    if (!hooks.length) return '';
    return `Competitor hooks to consider:\n- ${hooks.join('\n- ')}`;
  }

  static compareTemplatesWithTactics(templates: { hook: string }[], competitorHooks: string[]): { templateIndex: number; matches: string[] }[] {
    // Stub: match if template hook contains any competitor hook substring
    return templates.map((t, i) => ({
      templateIndex: i,
      matches: competitorHooks.filter(hook => t.hook.includes(hook)),
    }));
  }
} 