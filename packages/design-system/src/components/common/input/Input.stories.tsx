/**
 * Input Component Stories
 *
 * Storybook stories for the Input component showcasing all variants,
 * sizes, and states for design and development reference.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './Input';

const meta = {
  title: 'Components/Common/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// Primary Stories
// ============================================================================

export const Default: Story = {
  args: {
    placeholder: 'Enter text',
  },
};

export const Email: Story = {
  args: {
    type: 'email',
    placeholder: 'Enter your email',
  },
};

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Enter your password',
  },
};

export const Number: Story = {
  args: {
    type: 'number',
    placeholder: 'Enter a number',
  },
};

// ============================================================================
// Size Stories
// ============================================================================

export const SizeSM: Story = {
  args: {
    size: 'sm',
    placeholder: 'Small input',
  },
};

export const SizeMD: Story = {
  args: {
    size: 'md',
    placeholder: 'Medium input',
  },
};

export const SizeLG: Story = {
  args: {
    size: 'lg',
    placeholder: 'Large input',
  },
};

export const SizeXL: Story = {
  args: {
    size: 'xl',
    placeholder: 'Extra large input',
  },
};

// ============================================================================
// Variant Stories
// ============================================================================

export const Variant_Default: Story = {
  args: {
    variant: 'default',
    placeholder: 'Default variant',
  },
};

export const Variant_Error: Story = {
  args: {
    error: 'This field is required',
    placeholder: 'Input with error',
  },
};

export const Variant_Success: Story = {
  args: {
    variant: 'success',
    placeholder: 'Input with success',
  },
};

// ========================================================================
// State Stories
// ========================================================================

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: 'Disabled input',
  },
};

// ========================================================================
// Helper Text Stories
// ========================================================================

export const WithHelperText: Story = {
  args: {
    placeholder: 'Enter email',
    helperText: 'We will never share your email with anyone else',
  },
};

export const WithError: Story = {
  args: {
    placeholder: 'Enter email',
    error: 'Please enter a valid email address',
  },
};

// ========================================================================
// Icon Stories
// ========================================================================

export const WithIcon: Story = {
  args: {
    icon: '🔍',
    placeholder: 'Search...',
  },
};

export const WithIconEmail: Story = {
  args: {
    type: 'email',
    icon: '✉️',
    placeholder: 'Email address',
  },
};

// ========================================================================
// Constraint Stories
// ========================================================================

export const WithMaxLength: Story = {
  args: {
    maxLength: 10,
    placeholder: 'Max 10 characters',
  },
};

export const WithPattern: Story = {
  args: {
    pattern: '^[0-9]*$',
    placeholder: 'Numbers only',
  },
};

// ========================================================================
// All Sizes Showcase
// ========================================================================

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-full max-w-md">
      <Input size="sm" placeholder="Small" />
      <Input size="md" placeholder="Medium" />
      <Input size="lg" placeholder="Large" />
      <Input size="xl" placeholder="Extra Large" />
    </div>
  ),
};

// ========================================================================
// All Types Showcase
// ========================================================================

export const AllTypes: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-full max-w-md">
      <Input type="text" placeholder="Text input" />
      <Input type="email" placeholder="Email input" />
      <Input type="password" placeholder="Password input" />
      <Input type="number" placeholder="Number input" />
    </div>
  ),
};

// ========================================================================
// Interactive Demo
// ========================================================================

export const Interactive: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4 w-full max-w-md">
      <Input {...args} />
      <p className="text-sm text-gray-600">
        Try different variants, sizes, and states in the controls panel
      </p>
    </div>
  ),
  args: {
    placeholder: 'Enter text',
    type: 'text',
    size: 'md',
  },
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
    },
  },
};
