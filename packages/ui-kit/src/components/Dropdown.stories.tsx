import React, { useState } from 'react';
import { Meta, StoryObj } from '@storybook/react';
import { Dropdown } from './Dropdown';

const meta: Meta<typeof Dropdown> = {
  title: 'Components/Dropdown',
  component: Dropdown,
};

export default meta;
type Story = StoryObj<typeof Dropdown>;

// Helper component for dropdown demo
const DropdownDemo: React.FC<{ align?: 'left' | 'right' }> = ({ align = 'left' }) => {
  const [selected, setSelected] = useState<string>('');

  return (
    <div className="p-8 pt-32">
      <Dropdown onSelect={setSelected} align={align}>
        <Dropdown.Trigger>
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            {selected ? `Selected: ${selected}` : 'Open Menu'}
          </button>
        </Dropdown.Trigger>
        <Dropdown.Content align={align}>
          <Dropdown.Item value="option1" onSelect={setSelected}>
            Edit
          </Dropdown.Item>
          <Dropdown.Item value="option2" onSelect={setSelected}>
            Delete
          </Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item value="option3" onSelect={setSelected}>
            Share
          </Dropdown.Item>
          <Dropdown.Item value="option4" onSelect={setSelected}>
            Archive
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown>
    </div>
  );
};

export const Default: Story = {
  render: () => <DropdownDemo />,
};

export const AlignedRight: Story = {
  render: () => <DropdownDemo align="right" />,
};

export const WithDivider: Story = {
  render: () => {
    const [selected, setSelected] = useState<string>('');

    return (
      <div className="p-8 pt-32">
        <Dropdown onSelect={setSelected}>
          <Dropdown.Trigger>
            <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
              Actions
            </button>
          </Dropdown.Trigger>
          <Dropdown.Content>
            <Dropdown.Item value="create" onSelect={setSelected}>
              Create New
            </Dropdown.Item>
            <Dropdown.Item value="import" onSelect={setSelected}>
              Import
            </Dropdown.Item>
            <Dropdown.Item value="export" onSelect={setSelected}>
              Export
            </Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item value="settings" onSelect={setSelected}>
              Settings
            </Dropdown.Item>
            <Dropdown.Item value="help" onSelect={setSelected}>
              Help
            </Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item value="logout" onSelect={setSelected}>
              Logout
            </Dropdown.Item>
          </Dropdown.Content>
        </Dropdown>
        {selected && <p className="mt-4 text-gray-600">Selected action: {selected}</p>}
      </div>
    );
  },
};

export const UserMenu: Story = {
  render: () => {
    const [selected, setSelected] = useState<string>('');

    return (
      <div className="p-8 flex justify-end pt-32">
        <Dropdown onSelect={setSelected} align="right">
          <Dropdown.Trigger>
            <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center cursor-pointer text-white font-bold">
              JD
            </div>
          </Dropdown.Trigger>
          <Dropdown.Content align="right">
            <Dropdown.Item value="profile" onSelect={setSelected}>
              Profile
            </Dropdown.Item>
            <Dropdown.Item value="settings" onSelect={setSelected}>
              Settings
            </Dropdown.Item>
            <Dropdown.Item value="preferences" onSelect={setSelected}>
              Preferences
            </Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item value="logout" onSelect={setSelected}>
              Logout
            </Dropdown.Item>
          </Dropdown.Content>
        </Dropdown>
        {selected && <p className="mt-4 text-gray-600">Selected: {selected}</p>}
      </div>
    );
  },
};

export const MultipleDropdowns: Story = {
  render: () => {
    const [view, setView] = useState<string>('');
    const [sort, setSort] = useState<string>('');

    return (
      <div className="p-8 space-y-4">
        <div className="flex gap-4">
          <Dropdown onSelect={setView}>
            <Dropdown.Trigger>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100">
                View: {view || 'List'}
              </button>
            </Dropdown.Trigger>
            <Dropdown.Content>
              <Dropdown.Item value="list" onSelect={setView}>
                List View
              </Dropdown.Item>
              <Dropdown.Item value="grid" onSelect={setView}>
                Grid View
              </Dropdown.Item>
              <Dropdown.Item value="table" onSelect={setView}>
                Table View
              </Dropdown.Item>
            </Dropdown.Content>
          </Dropdown>

          <Dropdown onSelect={setSort}>
            <Dropdown.Trigger>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100">
                Sort: {sort || 'Date'}
              </button>
            </Dropdown.Trigger>
            <Dropdown.Content>
              <Dropdown.Item value="date" onSelect={setSort}>
                By Date
              </Dropdown.Item>
              <Dropdown.Item value="name" onSelect={setSort}>
                By Name
              </Dropdown.Item>
              <Dropdown.Item value="size" onSelect={setSort}>
                By Size
              </Dropdown.Item>
            </Dropdown.Content>
          </Dropdown>
        </div>
      </div>
    );
  },
};
