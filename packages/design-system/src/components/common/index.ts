/**
 * Wapsell Design System — Common Components
 *
 * Core UI components used across the Wapsell platform.
 * All components are strictly typed with TypeScript and fully accessible.
 *
 * @example
 * ```tsx
 * import { Button, Input, Card, Badge } from '@wapsell/design-system/components/common';
 *
 * <Button variant="primary">Click me</Button>
 * <Input type="email" placeholder="Email" />
 * <Card interactive>Card content</Card>
 * <Badge variant="success">Active</Badge>
 * ```
 */

// Button component
export { Button } from './button/Button';
export type { ButtonProps } from './button/Button.types';

// Input component
export { Input } from './input/Input';
export type { InputProps } from './input/Input.types';

// Card component
export { Card } from './card/Card';
export type { CardProps } from './card/Card.types';

// Badge component
export { Badge } from './badge/Badge';
export type { BadgeProps } from './badge/Badge.types';
