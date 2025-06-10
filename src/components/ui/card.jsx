import React from 'react';

export const Card = ({ children, className = '' }) => {
  return (
    <div
      className={`rounded-md border border-gray-300 shadow-sm ${className}`}
      role="region"
    >
      {children}
    </div>
  );
};
