import Joi from 'joi'; // Using Joi data validation library for schema validation

// Schema for registration
const registerSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().optional(),
  phone: Joi.string().optional(),
  displayName: Joi.string().optional(),
  firstName: Joi.string().optional(),
  lastName: Joi.string().optional(),
  password: Joi.string().min(6).required()
}).or('email', 'phone'); // at least one required

// Schema for login
const loginSchema = Joi.object({
  identifier: Joi.string().optional(), // can be username, email, or phone
  username: Joi.string().min(3).max(30).optional(), // explicit username field
  email: Joi.string().email().optional(),
  phone: Joi.string().optional(),
  password: Joi.string().required(),
  rememberMe: Joi.boolean().optional()
}).or('identifier', 'username', 'email', 'phone'); // at least one identifier required

export default {
  registerSchema,
  loginSchema
};
