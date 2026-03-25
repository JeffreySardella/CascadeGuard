'use client';

import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  MarkerType,
  Position,
} from '@xyflow/react';
import type { DetectedCascade, CascadeChain } from '@/lib/types';

interface CascadeVisualizationProps {
  cascades: DetectedCascade[];
  chains: CascadeChain[];
}

const DRUG_NODE_STYLE = {
  background: '#dcfce7',
  color: '#166534',
  border: '2px solid #166534',
  borderRadius: '8px',
  padding: '12px 16px',
  fontSize: '14px',
  fontWeight: 600,
  minWidth: '120px',
  textAlign: 'center' as const,
};

const EFFECT_NODE_STYLE = {
  background: '#ffedd5',
  color: '#9a3412',
  border: '2px solid #9a3412',
  borderRadius: '20px',
  padding: '8px 14px',
  fontSize: '13px',
  fontWeight: 500,
  minWidth: '100px',
  textAlign: 'center' as const,
};

export default function CascadeVisualization({
  cascades,
  chains,
}: CascadeVisualizationProps) {
  const { nodes, edges } = useMemo(() => {
    const nodeMap = new Map<string, Node>();
    const edgeList: Edge[] = [];

    let col = 0;

    for (const cascade of cascades) {
      const drugAId = `drug-${cascade.drugA.genericName}`;
      const drugBId = `drug-${cascade.drugB.genericName}`;
      const effectId = `effect-${cascade.drugA.genericName}-${cascade.pattern.sideEffect}`;

      // Drug A node
      if (!nodeMap.has(drugAId)) {
        nodeMap.set(drugAId, {
          id: drugAId,
          type: 'default',
          position: { x: col * 280, y: 0 },
          data: { label: cascade.drugA.genericName },
          style: DRUG_NODE_STYLE,
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        });
      }

      // Side effect node
      if (!nodeMap.has(effectId)) {
        nodeMap.set(effectId, {
          id: effectId,
          type: 'default',
          position: { x: col * 280 + 180, y: 60 },
          data: {
            label: cascade.faersCount > 0
              ? `${cascade.pattern.sideEffect}\n(${cascade.faersCount.toLocaleString()} reports)`
              : cascade.pattern.sideEffect,
          },
          style: EFFECT_NODE_STYLE,
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        });
      }

      // Drug B node
      if (!nodeMap.has(drugBId)) {
        nodeMap.set(drugBId, {
          id: drugBId,
          type: 'default',
          position: { x: (col + 1) * 280 + 80, y: 0 },
          data: { label: cascade.drugB.genericName },
          style: DRUG_NODE_STYLE,
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        });
      }

      // Edge: Drug A → side effect
      edgeList.push({
        id: `e-${drugAId}-${effectId}`,
        source: drugAId,
        target: effectId,
        label: 'causes',
        animated: true,
        style: { stroke: '#9a3412' },
        labelStyle: { fontSize: 11, fill: '#9a3412' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#9a3412' },
      });

      // Edge: side effect → Drug B
      edgeList.push({
        id: `e-${effectId}-${drugBId}`,
        source: effectId,
        target: drugBId,
        label: 'treated with',
        animated: true,
        style: { stroke: '#991b1b' },
        labelStyle: { fontSize: 11, fill: '#991b1b' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#991b1b' },
      });

      col++;
    }

    return { nodes: Array.from(nodeMap.values()), edges: edgeList };
  }, [cascades]);

  if (cascades.length === 0) return null;

  return (
    <div
      className="w-full h-[400px] md:h-[500px] border-2 border-gray-200 rounded-lg bg-white"
      role="img"
      aria-label={`Cascade visualization showing ${cascades.length} prescribing cascade${cascades.length !== 1 ? 's' : ''} among your medications`}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={2}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
