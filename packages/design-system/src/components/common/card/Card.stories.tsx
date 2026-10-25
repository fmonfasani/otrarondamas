/**
 * Card Component Stories
 *
 * Storybook stories for the Card component showcasing all variants,
 * states, and content options for design and development reference.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Card } from './Card';

const meta = {
  title: 'Components/Common/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// Primary Stories
// ============================================================================

export const Elevated: Story = {
  args: {
    variant: 'elevated',
    children: (
      <div>
        <h3 className="text-h3 mb-2">Card Title</h3>
        <p className="text-body">This is an elevated card</p>
      </div>
    ),
  },
};

export const Outlined: Story = {
  args: {
    variant: 'outlined',
    children: (
      <div>
        <h3 className="text-h3 mb-2">Card Title</h3>
        <p className="text-body">This is an outlined card</p>
      </div>
    ),
  },
};

export const Filled: Story = {
  args: {
    variant: 'filled',
    children: (
      <div>
        <h3 className="text-h3 mb-2">Card Title</h3>
        <p className="text-body">This is a filled card</p>
      </div>
    ),
  },
};

// ========================================================================
// Interactive Stories
// ========================================================================

export const Interactive: Story = {
  args: {
    variant: 'elevated',
    interactive: true,
    children: (
      <div>
        <h3 className="text-h3 mb-2">Click me!</h3>
        <p className="text-body">This is an interactive card</p>
      </div>
    ),
  },
};

// ========================================================================
// Content Examples
// ========================================================================

export const WithImage: Story = {
  args: {
    variant: 'elevated',
    children: (
      <div>
        <div className="w-full h-40 bg-gray-300 rounded mb-4 flex items-center justify-center">
          Image placeholder
        </div>
        <h3 className="text-h3 mb-2">Card with Image</h3>
        <p className="text-body">This card includes an image</p>
      </div>
    ),
  },
};

export const WithList: Story = {
  args: {
    variant: 'elevated',
    children: (
      <div>
        <h3 className="text-h3 mb-4">Features</h3>
        <ul className="space-y-2">
          <li className="text-body">✓ Feature 1</li>
          <li className="text-body">✓ Feature 2</li>
          <li className="text-body">✓ Feature 3</li>
        </ul>
      </div>
    ),
  },
};

export const Minimal: Story = {
  args: {
    variant: 'outlined',
    children: <p className="text-body">Simple text content</p>,
  },
};

// ========================================================================
// All Variants Showcase
// ========================================================================

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4 max-w-2xl">
      <Card variant="elevated">
        <h3 className="text-h3 mb-2">Elevated</h3>
        <p className="text-body">With shadow</p>
      </Card>
      <Card variant="outlined">
        <h3 className="text-h3 mb-2">Outlined</h3>
        <p className="text-body">With border</p>
      </Card>
      <Card variant="filled">
        <h3 className="text-h3 mb-2">Filled</h3>
        <p className="text-body">With background</p>
      </Card>
    </div>
  ),
};

// ========================================================================
// Grid Layout
// ========================================================================

export const Grid: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4 max-w-4xl">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} variant="elevated">
          <h3 className="text-h3 mb-2">Card {i}</h3>
          <p className="text-small">Content {i}</p>
        </Card>
      ))}
    </div>
  ),
};

// ========================================================================
// Interactive Demo
// ========================================================================

export const Demo: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4 max-w-md">
      <Card {...args}>
        <h3 className="text-h3 mb-2">Demo Card</h3>
        <p className="text-body">Try different variants and states</p>
      </Card>
      <p className="text-sm text-gray-600">Edit the controls panel to see different options</p>
    </div>
  ),
  args: {
    variant: 'elevated',
    interactive: false,
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['elevated', 'outlined', 'filled'],
    },
  },
};
