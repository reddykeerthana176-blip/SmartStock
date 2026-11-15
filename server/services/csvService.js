/**
 * High-performance CSV Import and Export Service
 */

/**
 * Convert array of objects to CSV string
 */
const jsonToCsv = (data, fields) => {
  if (!data || data.length === 0) return '';
  const header = fields.map((f) => `"${f.label || f.key}"`).join(',');
  const rows = data.map((item) => {
    return fields
      .map((f) => {
        let val = item[f.key];
        if (val === undefined || val === null) val = '';
        if (typeof val === 'object' && !(val instanceof Date)) val = JSON.stringify(val);
        const escaped = String(val).replace(/"/g, '""');
        return `"${escaped}"`;
      })
      .join(',');
  });

  return [header, ...rows].join('\r\n');
};

/**
 * Parse CSV string into array of objects
 */
const parseCsv = (csvText) => {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse header
  const headers = lines[0]
    .split(',')
    .map((h) => h.trim().replace(/^["']|["']$/g, ''));

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    // Regex to split by comma while respecting quotes
    const values = [];
    let insideQuotes = false;
    let currentVal = '';

    for (let charIndex = 0; charIndex < rawLine.length; charIndex++) {
      const char = rawLine[charIndex];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(currentVal.trim().replace(/^"|"$/g, ''));
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    values.push(currentVal.trim().replace(/^"|"$/g, ''));

    if (values.length === headers.length) {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = values[index];
      });
      rows.push(obj);
    }
  }

  return rows;
};

module.exports = {
  jsonToCsv,
  parseCsv,
};
