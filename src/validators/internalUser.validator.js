const Joi = require('joi');

/**
 * Query-string schema for GET /internal/v1/users/emails
 * All filters are optional; returns all active non-deleted users when omitted.
 */
const userEmailsQuerySchema = Joi.object({
  researchNetworkId: Joi.number().integer().positive().optional(),
  countryId:         Joi.number().integer().positive().optional(),
  institutionId:     Joi.number().integer().positive().optional(),
  isActive:          Joi.boolean().truthy('true', '1').falsy('false', '0').default(true)
});

module.exports = {
  userEmailsQuerySchema
};
