import React from 'react';
import { Meta, StoryObj } from '@storybook/react';
import { Modal } from './Modal';
import { ModalProvider } from '../contexts/ModalContext';
import { useModal } from '../hooks/useModal';

const meta: Meta<typeof Modal> = {
  title: 'Components/Modal',
  component: Modal,
  decorators: [
    (Story) => (
      <ModalProvider>
        <Story />
      </ModalProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Modal>;

// Helper component to trigger modal
const ModalTrigger: React.FC<{ size?: 'sm' | 'md' | 'lg' | 'xl'; hasCloseButton?: boolean }> = ({
  size = 'md',
  hasCloseButton = true,
}) => {
  const { openModal, closeModal } = useModal();

  return (
    <div className="flex gap-4 p-8">
      <button
        onClick={() => openModal('Modal Example', size, hasCloseButton)}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
      >
        Open Modal
      </button>

      <Modal>
        <Modal.Header>Modal Example</Modal.Header>
        <Modal.Body>
          <p>This is a modal component with customizable size and behavior.</p>
          <p className="mt-4">Try pressing Escape or clicking outside the modal to close it.</p>
          <input type="text" placeholder="Enter something..." className="w-full mt-4 p-2 border rounded" />
        </Modal.Body>
        <Modal.Footer>
          <button
            onClick={closeModal}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Save</button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export const Default: Story = {
  render: () => <ModalTrigger />,
};

export const SmallSize: Story = {
  render: () => <ModalTrigger size="sm" />,
};

export const LargeSize: Story = {
  render: () => <ModalTrigger size="lg" />,
};

export const ExtraLargeSize: Story = {
  render: () => <ModalTrigger size="xl" />,
};

export const WithoutCloseButton: Story = {
  render: () => <ModalTrigger hasCloseButton={false} />,
};

// Complex modal example
const ComplexModalExample: React.FC = () => {
  const { openModal, closeModal } = useModal();

  return (
    <div className="flex gap-4 p-8">
      <button
        onClick={() => openModal('Confirm Action', 'md', true)}
        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
      >
        Open Confirmation Modal
      </button>

      <Modal>
        <Modal.Header>Confirm Action</Modal.Header>
        <Modal.Body>
          <p className="text-red-600 font-semibold mb-4">Are you sure you want to proceed?</p>
          <p>This action cannot be undone.</p>
          <ul className="list-disc pl-6 mt-4 space-y-2">
            <li>All data will be deleted</li>
            <li>This cannot be reversed</li>
            <li>Make sure you have a backup</li>
          </ul>
        </Modal.Body>
        <Modal.Footer>
          <button
            onClick={closeModal}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>
          <button className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
            Confirm Delete
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export const ConfirmationModal: Story = {
  render: () => <ComplexModalExample />,
};
