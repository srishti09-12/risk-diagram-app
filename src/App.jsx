// App.js (updated to center node via translate calculation)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Tree from 'react-d3-tree';
import './App.css';
import { allMaps } from './Structures';

const riskLevels = ['high', 'medium', 'low'];
const riskColors = {
  high: '#e74c3c',
  medium: '#f1c40f',
  low: '#2ecc71'
};

function getRandomRisk() {
  return riskLevels[Math.floor(Math.random() * riskLevels.length)];
}

function generateTreeData(map, assignedRisks, highlightNode = null, expandPath = []) {
  function buildTree(node, currentDepth = 0) {
    const risk = assignedRisks[node] || 'low';
    const children = map[node];
    const collapsed = expandPath.includes(node) ? false : currentDepth >= 2;
    if (!children) return { name: node, risk, glow: node === highlightNode };
    return {
      name: node,
      risk,
      glow: node === highlightNode,
      collapsed,
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

function findPathToNode(map, target, current = null, path = []) {
  if (current === null) {
    const roots = Object.keys(map).filter(k => !Object.values(map).flat().includes(k));
    for (let root of roots) {
      const result = findPathToNode(map, target, root, []);
      if (result.length > 0) return result;
    }
    return [];
  }
  if (current === target) return [...path, current];
  const children = map[current] || [];
  for (let child of children) {
    const result = findPathToNode(map, target, child, [...path, current]);
    if (result.length > 0) return result;
  }
  return [];
}

export default function App() {
  const [selectedMapName, setSelectedMapName] = useState(null);
  const [componentMap, setComponentMap] = useState(null);
  const [treeData, setTreeData] = useState(null);
  const [assignedRisks, setAssignedRisks] = useState({});
  const [allComponents, setAllComponents] = useState(new Set());
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentScreen, setCurrentScreen] = useState('main');
  const [searchResults, setSearchResults] = useState([]);
  const [highlightNode, setHighlightNode] = useState(null);
  const containerRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [dialogText, setDialogText] = useState(null);
  const [expandPath, setExpandPath] = useState([]);
  const nodeRefMap = useRef({});

  useEffect(() => {
    if (!componentMap) return;
    const allComps = new Set(Object.keys(componentMap).concat(...Object.values(componentMap)));
    const riskMap = {};
    allComps.forEach((c) => (riskMap[c] = getRandomRisk()));
    setAssignedRisks(riskMap);
    const { tree, allComponents } = generateTreeData(componentMap, riskMap, highlightNode, expandPath);
    setTreeData(tree);
    setAllComponents(allComponents);
  }, [componentMap, highlightNode, expandPath]);

  useEffect(() => {
    if (!containerRef.current) return;
    const dimensions = containerRef.current.getBoundingClientRect();
    setTranslate({ x: dimensions.width / 2, y: 60 });
  }, [currentScreen]);

  useEffect(() => {
    if (highlightNode && nodeRefMap.current[highlightNode] && containerRef.current) {
      const container = containerRef.current;
      const nodeElement = nodeRefMap.current[highlightNode];

      const nodeBox = nodeElement.getBoundingClientRect();
      const containerBox = container.getBoundingClientRect();

      const offsetX = nodeBox.left + nodeBox.width / 2 - containerBox.left;
      const offsetY = nodeBox.top + nodeBox.height / 2 - containerBox.top;

      const newTranslate = {
        x: translate.x - (offsetX - containerBox.width / 2),
        y: translate.y - (offsetY - containerBox.height / 2),
      };

      setTranslate(newTranslate);
    }
  }, [treeData, highlightNode]);

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
      const path = findPathToNode(allMaps[name].componentMap, term);
      setExpandPath(path);
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
    const path = findPathToNode(allMaps[name].componentMap, highlightNode);
    setSelectedMapName(name);
    setComponentMap(allMaps[name].componentMap);
    setExpandPath(path);
    setCurrentScreen('viewer');
  };

  const handleReset = () => {
    if (!componentMap) return;
    setHighlightNode(null);
    const { tree } = generateTreeData(componentMap, assignedRisks);
    setTreeData(tree);
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
        ref={(el) => {
          if (el) nodeRefMap.current[nodeDatum.name] = el;
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setHoveredNode(null)}
        className={nodeDatum.glow ? 'node-glow' : ''}
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
          style={{ userSelect: 'none', pointerEvents: 'none', fontWeight: 'bold', fontSize: '12px' }}
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
          <button type="button" onClick={handleReset} style={{ marginLeft: '10px' }}>Reset</button>
        </form>
      </div>

      {currentScreen === 'mapChooser' && (
        <div className="map-chooser">
          <h3>Component found in multiple maps:</h3>
          <ul>
            {searchResults.map(({ name, description }) => (
              <li key={name} style={{ marginBottom: '1em' }}>
                <strong>{name}</strong>: {description}<br />
                <button onClick={() => handleMapChoice(name)}>View this Map</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {currentScreen === 'viewer' && treeData && (
        <div className="tree-container" ref={containerRef}>
          <Tree
            data={treeData}
            translate={translate}
            orientation="vertical"
            pathFunc="elbow"
            collapsible={true}
            zoomable={true}
            scaleExtent={{ min: 0.2, max: 1.2 }}
            separation={{ siblings: 1.3, nonSiblings: 2.5 }}
            renderCustomNodeElement={renderNodeWithCustomRect}
            styles={{
              nodes: { node: { circle: { r: 10 } }, leafNode: { circle: { r: 10 } } },
              links: { stroke: '#ffffff', strokeWidth: 2 }
            }}
          />
          {hoveredNode && dialogText && (
            <div className="hover-dialog" style={{ top: `${hoverPosition.y}px`, left: `${hoverPosition.x}px` }}>
              {dialogText}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
