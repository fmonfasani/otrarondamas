/**
 * Button Component Stories
 *
 * Storybook stories for the Button component showcasing all variants,
 * sizes, and states for design and development reference.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta = {
  title: 'Components/Common/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// Primary Stories
// ============================================================================

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline Button',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost Button',
  },
};

export const Danger: Story = {
  args: {
    variant: 'danger',
    children: 'Danger Button',
  },
};

// ============================================================================
// Size Stories
// ============================================================================

export const SizeXS: Story = {
  args: {
    size: 'xs',
    children: 'Extra Small',
  },
};

export const SizeSM: Story = {
  args: {
    size: 'sm',
    children: 'Small',
  },
};

export const SizeMD: Story = {
  args: {
    size: 'md',
    children: 'Medium',
  },
};

export const SizeLG: Story = {
  args: {
    size: 'lg',
    children: 'Large',
  },
};

export const SizeXL: Story = {
  args: {
    size: 'xl',
    children: 'Extra Large',
  },
};

// ============================================================================
// State Stories
// ============================================================================

export const Disabled: Story = {
  args: {
    variant: 'primary',
    disabled: true,
    children: 'Disabled Button',
  },
};

export const Loading: Story = {
  args: {
    variant: 'primary',
    loading: true,
    children: 'Loading Button',
  },
};

// ============================================================================
// Icon Stories
// ============================================================================

export const WithIcon: Story = {
  args: {
    variant: 'primary',
    icon: '✨',
    children: 'Button with Icon',
  },
};

export const IconOnly: Story = {
  args: {
    variant: 'primary',
    icon: '🎉',
    children: '',
  },
};

// ============================================================================
// All Variants Showcase
// ============================================================================

export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-4 flex-wrap justify-center">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
    </div>
  ),
};

// ============================================================================
// All Sizes Showcase
// ============================================================================

export const AllSizes: Story = {
  render: () => (
    <div className="flex gap-2 flex-wrap items-center justify-center">
      <Button size="xs">XS</Button>
      <Button size="sm">SM</Button>
      <Button size="md">MD</Button>
      <Button size="lg">LG</Button>
      <Button size="xl">XL</Button>
    </div>
  ),
};

// ============================================================================
// Interactive Demo
// ============================================================================

export const Interactive: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      <Button {...args}>Click me</Button>
      <p className="text-sm text-gray-600">
        Try different variants, sizes, and states in the controls panel
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
      options: ['primary', 'secondary', 'outline', 'ghost', 'danger'],
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
  },
};
