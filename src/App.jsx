import React, { useState, useEffect, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import './App.css';
import { allMaps } from './Structures';

const statusColors = {
  down: '#e74c3c',
  incident: '#f1c40f',
  maintenance: '#3498db',
  healthy: '#2ecc71',
  unknown: '#bdc3c7',
};

const CustomNode = ({ data, id }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef(null);

  const handleMouseEnter = () => {
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  return (
    <div
      style={{
        position: 'relative',
        textAlign: 'center',
        width: 80,
        color: 'white', // 👈 white text
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Handle type="target" position={Position.Left} />
      
      <div
        style={{
          width: 50,
          height: 50,
          borderRadius: '50%',
          backgroundColor: data.color,
          border: '2px solid #222',
          margin: '0 auto',
          boxShadow: data.glow ? '0 0 10px 4px gold' : 'none', // 🔥 glow effect
        }}
      ></div>

      <div style={{ fontSize: 24, marginTop: 4 }}>{data.label}</div>

      {showTooltip && (
        <div
          ref={tooltipRef}
          style={{
            position: 'absolute',
            top: -40,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#222',
            color: 'white',
            padding: '4px 8px',
            borderRadius: 4,
            fontSize: 24,
            whiteSpace: 'nowrap',
            zIndex: 100,
          }}
        >
          🔍 {data.label} may be unstable
        </div>
      )}

      <Handle type="source" position={Position.Right} />
    </div>
  );
};

function buildGraph(componentMap, statusMap, highlightNode = null, setTooltipData) {
  const nodes = [];
  const edges = [];
  const seen = new Set();

  const allNodes = new Set(Object.keys(componentMap));
  const allChildren = new Set(Object.values(componentMap).flat());
  const roots = [...allNodes].filter((n) => !allChildren.has(n));

  function walk(nodeId) {
    if (seen.has(nodeId)) return;
    seen.add(nodeId);
    const risk = statusMap[nodeId] || 'unknown';

    // Uncomment below to assign random color between red/yellow/green
    
    const randomColor = () => {
      const colors = ['#e74c3c', '#f1c40f', '#2ecc71']; // red, yellow, green
      return colors[Math.floor(Math.random() * colors.length)];
    };
    

    nodes.push({
  id: nodeId,
  type: 'custom',
  data: {
    label: nodeId,
    color:randomColor(),
    // color: statusColors[risk] || '#bdc3c7',
    glow: nodeId === highlightNode // 🔥 add glow info
  },
  position: { x: 0, y: 0 }
});


    const children = componentMap[nodeId] || [];
    for (const child of children) {
      edges.push({
        id: `e-${nodeId}-${child}`,
        source: nodeId,
        target: child,
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#888' },
      });
      walk(child);
    }
  }

  roots.forEach(walk);

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'LR', nodesep: 20, ranksep: 200 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 80, height: 80 });
  });
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const { x, y } = dagreGraph.node(node.id);
    return {
      ...node,
      position: { x, y },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };
  });

  return { nodes: layoutedNodes, edges };
}

export default function App() {
  const [selectedMapName, setSelectedMapName] = useState(null);
  const [componentMap, setComponentMap] = useState(null);
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [statusMap, setStatusMap] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [currentScreen, setCurrentScreen] = useState('main');
  const [searchResults, setSearchResults] = useState([]);
  const [highlightNode, setHighlightNode] = useState(null);
  const [tooltipData, setTooltipData] = useState(null);

  useEffect(() => {
    if (!componentMap) return;
    const allComps = Array.from(
      new Set(Object.keys(componentMap).concat(...Object.values(componentMap)))
    );
    const fetchStatuses = async () => {
      const results = {};
      await Promise.all(
        allComps.map(async (comp) => {
          try {
            const res = await fetch(`/status/${encodeURIComponent(comp)}`);
            const json = await res.json();
            results[comp] = json.status || 'unknown';
          } catch {
            results[comp] = 'unknown';
          }
        })
      );
      setStatusMap(results);
      setGraphData(buildGraph(componentMap, results, highlightNode, setTooltipData));
    };
    fetchStatuses();
  }, [componentMap, highlightNode]);

  const handleSearch = (e) => {
    e.preventDefault();
    const term = searchTerm.trim().toUpperCase();
    if (!term) return;
    const matches = [];
    for (const [name, { componentMap, mapDescription }] of Object.entries(allMaps)) {
      const allComps = new Set(
        Object.keys(componentMap).concat(...Object.values(componentMap))
      );
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
    setGraphData(buildGraph(componentMap, statusMap, null, setTooltipData));
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
          <button type="button" onClick={handleReset}>
            Reset
          </button>
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

      {currentScreen === 'viewer' && (
        <div className="tree-container" style={{ position: 'relative' }}>
          <ReactFlow
            nodes={graphData.nodes}
            edges={graphData.edges}
            nodeTypes={{ custom: CustomNode }}
            fitView
            panOnScroll
            zoomOnScroll
            defaultEdgeOptions={{ type: 'smoothstep' }}
          >
            <Background />
            <Controls />
          </ReactFlow>

          {/* ✅ Tooltip */}
          {tooltipData && (
            <div
              style={{
                position: 'absolute',
                left: tooltipData.x,
                top: tooltipData.y - 10,
                background: '#333',
                color: '#fff',
                padding: '6px 10px',
                fontSize: '50px',
                borderRadius: '4px',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                zIndex: 1000,
              }}
            >
              {tooltipData.label} - {tooltipData.status.toUpperCase()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
