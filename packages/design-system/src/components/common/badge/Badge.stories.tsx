/**
 * Badge Component Stories
 *
 * Storybook stories for the Badge component showcasing all variants
 * and sizes for design and development reference.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

const meta = {
  title: 'Components/Common/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// Primary Stories
// ============================================================================

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary',
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
    children: 'Success',
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    children: 'Warning',
  },
};

export const Danger: Story = {
  args: {
    variant: 'danger',
    children: 'Danger',
  },
};

export const Info: Story = {
  args: {
    variant: 'info',
    children: 'Info',
  },
};

export const Neutral: Story = {
  args: {
    variant: 'neutral',
    children: 'Neutral',
  },
};

// ============================================================================
// Size Stories
// ============================================================================

export const SizeSM: Story = {
  args: {
    variant: 'primary',
    size: 'sm',
    children: 'Small',
  },
};

export const SizeMD: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    children: 'Medium',
  },
};

// ========================================================================
// Status Examples
// ========================================================================

export const Active: Story = {
  args: {
    variant: 'success',
    children: 'Active',
  },
};

export const Pending: Story = {
  args: {
    variant: 'warning',
    children: 'Pending',
  },
};

export const Error: Story = {
  args: {
    variant: 'danger',
    children: 'Error',
  },
};

export const Draft: Story = {
  args: {
    variant: 'neutral',
    children: 'Draft',
  },
};

// ========================================================================
// All Variants Showcase
// ========================================================================

export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-2 flex-wrap justify-center">
      <Badge variant="primary">Primary</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="danger">Danger</Badge>
      <Badge variant="info">Info</Badge>
      <Badge variant="neutral">Neutral</Badge>
    </div>
  ),
};

// ========================================================================
// All Sizes Showcase
// ========================================================================

export const AllSizes: Story = {
  render: () => (
    <div className="flex gap-2 items-center justify-center">
      <Badge size="sm">Small</Badge>
      <Badge size="md">Medium</Badge>
    </div>
  ),
};

// ========================================================================
// Size Variants Combination
// ========================================================================

export const SizeVariantCombinations: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 flex-wrap">
        <Badge variant="success" size="sm">
          ✓ Success SM
        </Badge>
        <Badge variant="success" size="md">
          ✓ Success MD
        </Badge>
      </div>
      <div className="flex gap-2 flex-wrap">
        <Badge variant="danger" size="sm">
          ✗ Error SM
        </Badge>
        <Badge variant="danger" size="md">
          ✗ Error MD
        </Badge>
      </div>
    </div>
  ),
};

// ========================================================================
// Status Flow Example
// ========================================================================

export const StatusFlow: Story = {
  render: () => (
    <div className="flex gap-3 items-center">
      <Badge variant="neutral" size="sm">
        Draft
      </Badge>
      <span className="text-2xl">→</span>
      <Badge variant="info" size="sm">
        Pending
      </Badge>
      <span className="text-2xl">→</span>
      <Badge variant="success" size="sm">
        Active
      </Badge>
    </div>
  ),
};

// ========================================================================
// Interactive Demo
// ========================================================================

export const Interactive: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      <Badge {...args}>Badge Text</Badge>
      <p className="text-sm text-gray-600">
        Try different variants and sizes in the controls panel
      </p>
    </div>
  ),
  args: {
    variant: 'primary',
    size: 'md',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'success', 'warning', 'danger', 'info', 'neutral'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md'],
    },
  },
};
