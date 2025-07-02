import React, { useState, useEffect, useRef } from 'react';
import Tree from 'react-d3-tree';
import './App.css';
import { allMaps } from './Structures';

const statusColors = {
  down: '#e74c3c',
  incident: '#f1c40f',
  maintenance: '#3498db',
  healthy: '#2ecc71',
  unknown: '#bdc3c7'
};

function generateTreeData(map, statusMap, highlightNode = null) {
  function buildTree(node, currentDepth = 0) {
    const risk = statusMap[node] || 'unknown';
    const children = map[node];
    if (!children) return { name: node, risk, glow: node === highlightNode };
    return {
      name: node,
      risk,
      glow: node === highlightNode,
      collapsed: false,
      children: children.map((child) => buildTree(child, currentDepth + 1))
    };
  }

  const allNodes = new Set(Object.keys(map));
  const childrenNodes = new Set(Object.values(map).flat());
  const roots = [...allNodes].filter((n) => !childrenNodes.has(n));
  const fullTreeData = roots.map((r) => buildTree(r));

  return {
    tree: fullTreeData.length === 1 ? fullTreeData[0] : { name: 'Root', children: fullTreeData },
    allComponents: new Set([...allNodes, ...childrenNodes])
  };
}

async function fetchStatusFromBackend(name) {
  try {
    const res = await fetch(`/status/${encodeURIComponent(name)}`);
    const json = await res.json();
    return json.status || 'unknown';
  } catch {
    return 'unknown';
  }
}

export default function App() {
  const [selectedMapName, setSelectedMapName] = useState(null);
  const [componentMap, setComponentMap] = useState(null);
  const [treeData, setTreeData] = useState(null);
  const [statusMap, setStatusMap] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [currentScreen, setCurrentScreen] = useState('main');
  const [searchResults, setSearchResults] = useState([]);
  const [highlightNode, setHighlightNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [dialogText, setDialogText] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    if (!componentMap) return;
    const allComps = Array.from(new Set(Object.keys(componentMap).concat(...Object.values(componentMap))));
    const fetchStatuses = async () => {
      const results = {};
      await Promise.all(
        allComps.map(async (comp) => {
          results[comp] = await fetchStatusFromBackend(comp);
        })
      );
      setStatusMap(results);
      const { tree } = generateTreeData(componentMap, results, highlightNode);
      setTreeData(tree);
    };
    fetchStatuses();
  }, [componentMap, highlightNode]);

  const handleSearch = (e) => {
    e.preventDefault();
    const term = searchTerm.trim().toUpperCase();
    if (!term) return;
    const matches = [];
    for (const [name, { componentMap, mapDescription }] of Object.entries(allMaps)) {
      const allComps = new Set(Object.keys(componentMap).concat(...Object.values(componentMap)));
      if (allComps.has(term)) {
        matches.push({ name, description: mapDescription });
      }
    }
    if (matches.length === 0) {
      alert(`Component "${term}" not found.`);
    } else if (matches.length === 1) {
      const name = matches[0].name;
      setSelectedMapName(name);
      setComponentMap(allMaps[name].componentMap);
      setHighlightNode(term);
      setCurrentScreen('viewer');
    } else {
      setSearchResults(matches);
      setHighlightNode(term);
      setCurrentScreen('mapChooser');
    }
    setSearchTerm('');
  };

  const handleMapChoice = (name) => {
    setSelectedMapName(name);
    setComponentMap(allMaps[name].componentMap);
    setCurrentScreen('viewer');
  };

  const handleReset = () => {
    if (!componentMap) return;
    setHighlightNode(null);
    setHoveredNode(null);
    const { tree } = generateTreeData(componentMap, statusMap);
    setTreeData(tree);
  };

  const renderNodeWithCustomRect = ({ nodeDatum }) => {
    const width = 120;
    const height = 40;
    const rectRadius = 6;
    const fill = statusColors[nodeDatum.risk] || '#bdc3c7';

    const handleMouseEnter = (e) => {
      if (nodeDatum.risk === 'unknown') {
        const rect = containerRef.current.getBoundingClientRect();
        setHoveredNode(nodeDatum);
        setDialogText(`💬 ${nodeDatum.name} is causing instability due to backend errors.`);
        setHoverPosition({
          x: e.clientX - rect.left + 10,
          y: e.clientY - rect.top + 10
        });
      }
    };

    const handleMouseMove = (e) => {
      if (nodeDatum.risk === 'unknown') {
        const rect = containerRef.current.getBoundingClientRect();
        setHoverPosition({
          x: e.clientX - rect.left + 10,
          y: e.clientY - rect.top + 10
        });
      }
    };

    const handleMouseLeave = () => {
      setHoveredNode(null);
      setDialogText('');
    };

    return (
      <g
        className={nodeDatum.glow ? 'node-glow' : ''}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
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
        />
        <text
          fill="#000"
          strokeWidth={0.5}
          x={0}
          y={5}
          textAnchor="middle"
          style={{
            userSelect: 'none',
            pointerEvents: 'none',
            fontWeight: '400',
            fontSize: '12px'
          }}
        >
          {nodeDatum.name.length > 10 ? nodeDatum.name.slice(0, 10) + '…' : nodeDatum.name}
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
          <button type="button" onClick={handleReset}>Reset</button>
        </form>
      </div>

      {currentScreen === 'mapChooser' && (
  <div className="map-chooser-card">
    <h2>🔍 Component Found in Multiple Maps</h2>
    <div className="map-list">
      {searchResults.map(({ name, description }) => (
        <div key={name} className="map-item">
          <div className="map-title">{name}</div>
          <div className="map-description">{description}</div>
          <button className="view-map-btn" onClick={() => handleMapChoice(name)}>
            View Map
          </button>
        </div>
      ))}
    </div>
  </div>
      )}

      {currentScreen === 'viewer' && treeData && (
        <div className="tree-container" ref={containerRef}>
          <Tree
            data={treeData}
            orientation="horizontal"
            translate={{ x: 100, y: 400 }}
            pathFunc="elbow"
            collapsible={false}
            zoomable={false}
            panOnScroll={false}
            panOnDrag={false}
            enableLegacyTransitions={false}
            scaleExtent={{ min: 1, max: 1 }}
            separation={{ siblings: 0.4, nonSiblings: 0.6 }}
            renderCustomNodeElement={renderNodeWithCustomRect}
            styles={{
              nodes: { node: { circle: { r: 10 } }, leafNode: { circle: { r: 10 } } },
              links: { stroke: '#ccc', strokeWidth: 1.5 }
            }}
          />

          {hoveredNode && (
            <div
              className="hover-dialog"
              style={{
                position: 'absolute',
                left: hoverPosition.x,
                top: hoverPosition.y
              }}
            >
              {dialogText}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
