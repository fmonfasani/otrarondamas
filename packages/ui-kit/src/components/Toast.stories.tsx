import React from 'react';
import { Meta, StoryObj } from '@storybook/react';
import { ToastProvider } from '../contexts/ToastContext';
import { ToastContainer } from './Toast';
import { useToast } from '../hooks/useToast';

const meta: Meta<typeof ToastContainer> = {
  title: 'Components/Toast',
  component: ToastContainer,
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ToastContainer>;

// Helper component to trigger toasts
const ToastDemo: React.FC = () => {
  const { toast } = useToast();

  return (
    <div className="p-8 space-y-4">
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">Toast Types</h3>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => toast('Operation completed successfully!', 'success')}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            Success
          </button>
          <button
            onClick={() => toast('An error occurred. Please try again.', 'error')}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Error
          </button>
          <button
            onClick={() => toast('This is an informational message.', 'info')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Info
          </button>
          <button
            onClick={() => toast('Please be careful with this action.', 'warning')}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
          >
            Warning
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold text-lg">Toast Positions</h3>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => toast('Top Left Toast', 'success', 3000, 'top-left')}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
          >
            Top Left
          </button>
          <button
            onClick={() => toast('Top Center Toast', 'success', 3000, 'top-center')}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
          >
            Top Center
          </button>
          <button
            onClick={() => toast('Top Right Toast', 'success', 3000, 'top-right')}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
          >
            Top Right
          </button>
          <button
            onClick={() => toast('Bottom Left Toast', 'success', 3000, 'bottom-left')}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
          >
            Bottom Left
          </button>
          <button
            onClick={() => toast('Bottom Center Toast', 'success', 3000, 'bottom-center')}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
          >
            Bottom Center
          </button>
          <button
            onClick={() => toast('Bottom Right Toast', 'success', 3000, 'bottom-right')}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
          >
            Bottom Right
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold text-lg">Toast Durations</h3>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => toast('This will disappear in 1 second', 'success', 1000)}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            1 Second
          </button>
          <button
            onClick={() => toast('This will disappear in 3 seconds', 'success', 3000)}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            3 Seconds (Default)
          </button>
          <button
            onClick={() => toast('This will disappear in 5 seconds', 'success', 5000)}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            5 Seconds
          </button>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
};

export const Default: Story = {
  render: () => <ToastDemo />,
};

export const SuccessToast: Story = {
  render: () => (
    <ToastDemo />
  ),
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector('button');
    button?.click();
  },
};

export const MultipleToasts: Story = {
  render: () => {
    const { toast } = useToast();

    return (
      <div className="p-8">
        <button
          onClick={() => {
            toast('First toast', 'success');
            toast('Second toast', 'info');
            toast('Third toast', 'warning');
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Show Multiple Toasts
        </button>
        <ToastContainer />
      </div>
    );
  },
};
