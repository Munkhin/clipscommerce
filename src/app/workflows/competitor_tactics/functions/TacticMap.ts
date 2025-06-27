import type { TaxonomyMapResult } from './TaxonomyMapper';

export interface TacticMapNode {
  id: string;
  label: string;
  type: 'hook' | 'cta' | 'format';
}

export interface TacticMapEdge {
  from: string;
  to: string;
  relation: string;
}

export interface TacticMapData {
  nodes: TacticMapNode[];
  edges: TacticMapEdge[];
}

export class TacticMap {
  generateMap(taxonomy: TaxonomyMapResult): TacticMapData {
    const nodes: TacticMapNode[] = [];
    const edges: TacticMapEdge[] = [];
    // Add hook nodes
    Object.entries(taxonomy.hookTaxonomy).forEach(([group, hooks]) => {
      hooks.forEach(hook => {
        nodes.push({ id: `hook:${hook}`, label: hook, type: 'hook' });
        edges.push({ from: `hook-group:${group}`, to: `hook:${hook}`, relation: 'group' });
      });
      nodes.push({ id: `hook-group:${group}`, label: group, type: 'hook' });
    });
    // Add cta nodes
    Object.entries(taxonomy.ctaTaxonomy).forEach(([group, ctas]) => {
      ctas.forEach(cta => {
        nodes.push({ id: `cta:${cta}`, label: cta, type: 'cta' });
        edges.push({ from: `cta-group:${group}`, to: `cta:${cta}`, relation: 'group' });
      });
      nodes.push({ id: `cta-group:${group}`, label: group, type: 'cta' });
    });
    // Add format nodes
    Object.entries(taxonomy.formatTaxonomy).forEach(([group, formats]) => {
      formats.forEach(format => {
        nodes.push({ id: `format:${format}`, label: format, type: 'format' });
        edges.push({ from: `format-group:${group}`, to: `format:${format}`, relation: 'group' });
      });
      nodes.push({ id: `format-group:${group}`, label: group, type: 'format' });
    });
    return { nodes, edges };
  }
} 