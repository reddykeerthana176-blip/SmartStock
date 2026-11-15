/**
 * Production-ready structured logger
 */

const info = (message, meta = {}) => {
  const timestamp = new Date().toISOString();
  console.log(JSON.stringify({ level: 'INFO', timestamp, message, ...meta }));
};

const warn = (message, meta = {}) => {
  const timestamp = new Date().toISOString();
  console.warn(JSON.stringify({ level: 'WARN', timestamp, message, ...meta }));
};

const error = (message, err = null, meta = {}) => {
  const timestamp = new Date().toISOString();
  const errorMeta = err
    ? {
        errorName: err.name,
        errorMessage: err.message,
        stack: err.stack,
      }
    : {};
  console.error(JSON.stringify({ level: 'ERROR', timestamp, message, ...errorMeta, ...meta }));
};

module.exports = {
  info,
  warn,
  error,
};
