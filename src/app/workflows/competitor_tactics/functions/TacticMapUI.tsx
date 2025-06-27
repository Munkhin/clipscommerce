import React from 'react';
import type { TacticMapData, TacticMapNode, TacticMapEdge } from './TacticMap';

interface TacticMapUIProps {
  tacticMap: TacticMapData;
}

export const TacticMapUI: React.FC<TacticMapUIProps> = ({ tacticMap }) => {
  // Group nodes by type and group label
  const groupNodes = (type: TacticMapNode['type']) => {
    const groups = tacticMap.nodes.filter(n => n.id.startsWith(`${type}-group:`));
    return groups.map(group => {
      const children = tacticMap.edges
        .filter(e => e.from === group.id)
        .map(e => tacticMap.nodes.find(n => n.id === e.to))
        .filter(Boolean) as TacticMapNode[];
      return (
        <div key={group.id} style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 'bold', color: '#444' }}>{group.label}</div>
          <ul style={{ marginLeft: 16 }}>
            {children.map(child => (
              <li key={child.id} style={{ color: '#666' }}>{child.label}</li>
            ))}
          </ul>
        </div>
      );
    });
  };

  return (
    <div style={{ fontFamily: 'inherit', padding: 16 }}>
      <h3 style={{ borderBottom: '1px solid #eee', marginBottom: 16 }}>Tactic Map Visualization</h3>
      <div style={{ display: 'flex', gap: 32 }}>
        <div>
          <h4>Hooks</h4>
          {groupNodes('hook')}
        </div>
        <div>
          <h4>CTAs</h4>
          {groupNodes('cta')}
        </div>
        <div>
          <h4>Formats</h4>
          {groupNodes('format')}
        </div>
      </div>
    </div>
  );
}; 