/**
 * Service-layer utility helpers
 * Reusable guards and helpers for use inside service functions.
 */

/**
 * Assert that a multipart update request contains at least one change.
 * Throws 400 if both text fields and file paths are empty.
 *
 * Use this in every PUT service that accepts multipart/form-data,
 * since Joi's .min(1) on the schema cannot see req.files — it only
 * validates req.body text fields and would incorrectly reject
 * image-only updates.
 *
 * @param {Object} textUpdates  - Destructured req.body fields (camelCase)
 * @param {Object} filePaths    - tempImagePaths from upload middleware (may be {})
 *
 * @example
 * const updateAnnouncement = async (id, data) => {
 *   const { tempImagePaths = {}, ...updates } = data;
 *   assertHasUpdates(updates, tempImagePaths);
 *   // ...
 * };
 */
const assertHasUpdates = (textUpdates = {}, filePaths = {}) => {
  const hasText = Object.keys(textUpdates).length > 0;
  const hasFiles = Object.keys(filePaths).length > 0;
  if (!hasText && !hasFiles) {
    const error = new Error('At least one field must be provided');
    error.statusCode = 400;
    throw error;
  }
};

module.exports = {
  assertHasUpdates
};
