/**
 * Case Conversion Utilities
 * 
 * Handles conversion between camelCase (API/JavaScript) and snake_case (Database/SQL)
 * to maintain consistency across the application layers.
 */

/**
 * Convert object keys from camelCase to snake_case
 * @param {Object} obj - Object with camelCase keys
 * @returns {Object} Object with snake_case keys
 * 
 * @example
 * toSnakeCase({ firstName: 'John', institutionId: 5 })
 * // Returns: { first_name: 'John', institution_id: 5 }
 */
const toSnakeCase = (obj) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }
  
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    // Convert camelCase to snake_case
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
};

/**
 * Convert object keys from snake_case to camelCase
 * @param {Object} obj - Object with snake_case keys
 * @returns {Object} Object with camelCase keys
 * 
 * @example
 * toCamelCase({ first_name: 'John', institution_id: 5 })
 * // Returns: { firstName: 'John', institutionId: 5 }
 */
const toCamelCase = (obj) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }
  
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    // Convert snake_case to camelCase
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  return result;
};

/**
 * Convert array of objects from snake_case to camelCase
 * @param {Array} arr - Array of objects with snake_case keys
 * @returns {Array} Array of objects with camelCase keys
 * 
 * @example
 * toCamelCaseArray([
 *   { first_name: 'John', institution_id: 5 },
 *   { first_name: 'Jane', institution_id: 3 }
 * ])
 * // Returns: [
 * //   { firstName: 'John', institutionId: 5 },
 * //   { firstName: 'Jane', institutionId: 3 }
 * // ]
 */
const toCamelCaseArray = (arr) => {
  if (!Array.isArray(arr)) {
    return arr;
  }
  return arr.map(obj => toCamelCase(obj));
};

module.exports = {
  toSnakeCase,
  toCamelCase,
  toCamelCaseArray
};
