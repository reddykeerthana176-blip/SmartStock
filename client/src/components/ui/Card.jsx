import React from 'react';

export const Card = ({ children, className = '', hover = false, ...props }) => {
  return (
    <div
      className={`bg-white dark:bg-darkBg-card rounded-xl border border-gray-200/80 dark:border-darkBg-border shadow-soft p-5 transition-all duration-200 ${
        hover ? 'hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
