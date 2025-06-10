import React, { useState, useEffect, useRef } from 'react';
import Tree from 'react-d3-tree';
import './App.css';

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

const riskLevels = ['high', 'medium', 'low'];
const riskColors = {
  high: '#e74c3c',
  medium: '#f1c40f',
  low: '#2ecc71',
};

function getRandomRisk() {
  return riskLevels[Math.floor(Math.random() * riskLevels.length)];
}

const assignedRisks = {};
const allComponents = new Set(Object.keys(componentMap).concat(...Object.values(componentMap)));
allComponents.forEach((comp) => {
  assignedRisks[comp] = getRandomRisk();
});

function buildTree(node) {
  const risk = assignedRisks[node] || 'low';
  const children = componentMap[node];
  if (!children) return { name: node, risk };
  return {
    name: node,
    risk,
    children: children.map(buildTree),
  };
}

const allNodes = new Set(Object.keys(componentMap));
const childrenNodes = new Set(Object.values(componentMap).flat());
const roots = [...allNodes].filter((n) => !childrenNodes.has(n));
const fullTreeData = roots.map(buildTree);

export default function App() {
  const [treeData, setTreeData] = useState(
    fullTreeData.length === 1 ? fullTreeData[0] : { name: 'Root', children: fullTreeData }
  );
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [dialogText, setDialogText] = useState(null);

  useEffect(() => {
    const dimensions = containerRef.current.getBoundingClientRect();
    setTranslate({ x: dimensions.width / 2, y: 60 });
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const term = searchTerm.trim().toUpperCase();
    if (!allComponents.has(term)) {
      alert(`Component "${term}" not found.`);
      return;
    }
    const risk = assignedRisks[term];
    if (risk === 'low' || risk === 'medium') {
      alert(`Component "${term}" has no effect on the system.`);
    } else {
      setTreeData(buildTree(term));
    }
    setSearchTerm('');
  };

  const handleReset = () => {
    setTreeData(fullTreeData.length === 1 ? fullTreeData[0] : { name: 'Root', children: fullTreeData });
  };

  const renderNodeWithCustomRect = ({ nodeDatum, toggleNode }) => {
    const width = 120;
    const height = 40;
    const rectRadius = 6;
    const fill = riskColors[nodeDatum.risk] || '#ccc';

    const handleMouseEnter = (e) => {
      if (nodeDatum.risk === 'high') {
        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.min(e.clientX - rect.left, rect.width - 260);
        const y = Math.max(e.clientY - rect.top - 40, 10);
        setHoveredNode(nodeDatum);
        setHoverPosition({ x, y });
        setDialogText(`💬 ${nodeDatum.name} is causing instability due to deployment errors.`);
      }
    };

    return (
      <g
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setHoveredNode(null)}
      >
        <rect
          width={width}
          height={height}
          y={-height / 2}
          x={-width / 2}
          fill={fill}
          stroke="#333"
          strokeWidth={2}
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

  return (
    <div className="app-container">
      <div className="search-bar">
        <form onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search component (e.g., ULDEC)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="submit">Search</button>
          <button type="button" onClick={handleReset} style={{ marginLeft: '10px' }}>
            Reset
          </button>
        </form>
      </div>

      <div className="tree-container" ref={containerRef}>
        <Tree
          data={treeData}
          translate={translate}
          orientation="vertical"
          pathFunc="elbow"
          collapsible
          zoomable
          initialDepth={2}
          renderCustomNodeElement={renderNodeWithCustomRect}
          styles={{ links: { stroke: '#888', strokeWidth: 2 } }}
        />
        {hoveredNode && dialogText && (
          <div
            className="hover-dialog"
            style={{ top: `${hoverPosition.y}px`, left: `${hoverPosition.x}px` }}
          >
            {dialogText}
          </div>
        )}
      </div>
    </div>
  );
}
