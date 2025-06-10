import React from 'react';
import ReactDOM from 'react-dom/client';
import RiskDiagramApp from './app';  // since your main file is app.jsx
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RiskDiagramApp />
  </React.StrictMode>
);
