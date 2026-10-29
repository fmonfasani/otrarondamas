/**
 * @wapsell/types
 * Single source of truth for types across all Wapsell applications
 *
 * Exports all types organized by domain:
 * - auth: Authentication and authorization
 * - tenant: Business and tenant management
 * - common: Shared/foundational types
 * - pos: Point of Sale and payments
 * - tienda: E-commerce and online store
 * - dashboard: Analytics and reporting
 * - admin: Administration and audit
 */

// Common types and utilities
export * from './common';

// Auth and authentication
export * from './auth';

// Tenant and business context
export * from './tenant';

// POS and sales
export * from './pos';

// E-commerce and online store
export * from './tienda';

// Analytics and dashboards
export * from './dashboard';

// Admin and management
export * from './admin';

// Re-export Zod for convenient validation in consuming apps
export { z } from 'zod';
