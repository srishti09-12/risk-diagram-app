// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import Tree from 'react-d3-tree';

const componentMap = {
  ULSHIP: ['AEAPS', 'ULDEC', 'DEPCT'],
  ULDEC: ['ULDEC_PRICING', 'UMGM'],
  DEPCT: ['CMBS1', 'CORD', 'FICO_DMP'],
  ULAPY: ['ULDEC2', 'FRIES'],
  ULDEC2: ['DEPCT2'],
  DEPCT2: ['CMBS1_2'],
  FRIES: ['FRAUD', 'IDPF', 'CIP', 'SOCURE'],
  CIP: ['ECBSV', 'LEXIS', 'EWS'],
  ULAPY_LOAD: ['ACAPS'],
  ACAPS: ['SHAW'],
  SHAW: ['EIW', 'BMG'],
};

// Hardcoded risk levels and colors (random assignment)
const riskLevels = ['high', 'medium', 'low'];
const riskColors = {
  high: '#e74c3c',    // red
  medium: '#f1c40f',  // yellow
  low: '#2ecc71',     // green
};

function getRandomRisk() {
  return riskLevels[Math.floor(Math.random() * riskLevels.length)];
}

// Recursive function to build tree data with risk level info
function buildTree(node) {
  const children = componentMap[node];
  const risk = getRandomRisk();
  if (!children) {
    return { name: node, risk };
  }
  return {
    name: node,
    risk,
    children: children.map(buildTree),
  };
}

// Roots detection
const allNodes = new Set(Object.keys(componentMap));
const childrenNodes = new Set(Object.values(componentMap).flat());
const roots = [...allNodes].filter((n) => !childrenNodes.has(n));
const treeData = roots.map(buildTree);

// Custom node renderer to draw colored rectangles with text
const renderNodeWithCustomRect = ({ nodeDatum, toggleNode }) => {
  const width = 120;
  const height = 40;
  const rectRadius = 6;

  // Get fill color based on risk level
  const fill = riskColors[nodeDatum.risk] || '#ccc';

  return (
    <g>
      <rect
        width={width}
        height={height}
        y={-height / 2}
        x={-width / 2}
        fill={fill}
        stroke="#555"
        strokeWidth={1.5}
        rx={rectRadius}
        ry={rectRadius}
        style={{ cursor: 'pointer' }}
        onClick={toggleNode}
      />
      <text
        fill="#000"
        strokeWidth={0.5}
        x={0}
        y={5}
        textAnchor="middle"
        style={{ userSelect: 'none', pointerEvents: 'none', fontWeight: 'bold' }}
      >
        {nodeDatum.name}
      </text>
    </g>
  );
};

export default function App() {
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  useEffect(() => {
    const dimensions = containerRef.current.getBoundingClientRect();
    setTranslate({
      x: dimensions.width / 2,
      y: 50,
    });
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh' }} ref={containerRef}>
      <Tree
        data={treeData.length === 1 ? treeData[0] : { name: 'Root', children: treeData }}
        translate={translate}
        orientation="vertical"
        pathFunc="elbow"
        collapsible={true}
        zoomable={true}
        initialDepth={2}
        renderCustomNodeElement={renderNodeWithCustomRect}
        styles={{
          links: {
            stroke: '#888',
            strokeWidth: 2,
          },
        }}
      />
    </div>
  );
}
