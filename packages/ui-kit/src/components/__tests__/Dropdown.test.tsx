import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Dropdown } from '../Dropdown';

const DropdownTestComponent: React.FC = () => {
  const [selected, setSelected] = React.useState<string>('');

  return (
    <div>
      <Dropdown onSelect={setSelected}>
        <Dropdown.Trigger>
          <button>Open Menu</button>
        </Dropdown.Trigger>
        <Dropdown.Content>
          <Dropdown.Item value="option1" onSelect={setSelected}>
            Option 1
          </Dropdown.Item>
          <Dropdown.Item value="option2" onSelect={setSelected}>
            Option 2
          </Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item value="option3" onSelect={setSelected}>
            Option 3
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown>
      {selected && <p>Selected: {selected}</p>}
    </div>
  );
};

describe('Dropdown Component', () => {
  it('should open dropdown when trigger is clicked', () => {
    render(<DropdownTestComponent />);

    const trigger = screen.getByRole('button', { name: /open menu/i });
    fireEvent.click(trigger);

    expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
  });

  it('should close dropdown when clicking outside', async () => {
    render(<DropdownTestComponent />);

    const trigger = screen.getByRole('button', { name: /open menu/i });
    fireEvent.click(trigger);

    expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(screen.queryByTestId('dropdown-menu')).not.toBeInTheDocument();
    });
  });

  it('should select item when clicked', async () => {
    render(<DropdownTestComponent />);

    const trigger = screen.getByRole('button', { name: /open menu/i });
    fireEvent.click(trigger);

    const option1 = screen.getByRole('button', { name: /option 1/i });
    fireEvent.click(option1);

    await waitFor(() => {
      expect(screen.getByText('Selected: option1')).toBeInTheDocument();
    });
  });

  it('should navigate items with arrow keys', async () => {
    const { container } = render(<DropdownTestComponent />);

    const trigger = screen.getByRole('button', { name: /open menu/i });
    fireEvent.click(trigger);

    const items = screen.getAllByTestId('dropdown-item');
    expect(items[0]).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'ArrowDown' });

    await waitFor(() => {
      expect(items[0]).toHaveFocus();
    });

    fireEvent.keyDown(document, { key: 'ArrowDown' });

    await waitFor(() => {
      expect(items[1]).toHaveFocus();
    });
  });

  it('should navigate backwards with arrow up key', async () => {
    render(<DropdownTestComponent />);

    const trigger = screen.getByRole('button', { name: /open menu/i });
    fireEvent.click(trigger);

    const items = screen.getAllByTestId('dropdown-item');

    fireEvent.keyDown(document, { key: 'ArrowDown' });
    fireEvent.keyDown(document, { key: 'ArrowDown' });

    await waitFor(() => {
      expect(items[1]).toHaveFocus();
    });

    fireEvent.keyDown(document, { key: 'ArrowUp' });

    await waitFor(() => {
      expect(items[0]).toHaveFocus();
    });
  });

  it('should close dropdown with Escape key', async () => {
    render(<DropdownTestComponent />);

    const trigger = screen.getByRole('button', { name: /open menu/i });
    fireEvent.click(trigger);

    expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByTestId('dropdown-menu')).not.toBeInTheDocument();
    });
  });

  it('should select item with Enter key', async () => {
    render(<DropdownTestComponent />);

    const trigger = screen.getByRole('button', { name: /open menu/i });
    fireEvent.click(trigger);

    const items = screen.getAllByTestId('dropdown-item');

    fireEvent.keyDown(document, { key: 'ArrowDown' });

    await waitFor(() => {
      expect(items[0]).toHaveFocus();
    });

    fireEvent.keyDown(document, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('Selected: option1')).toBeInTheDocument();
    });
  });

  it('should focus first item when dropdown opens', async () => {
    render(<DropdownTestComponent />);

    const trigger = screen.getByRole('button', { name: /open menu/i });
    fireEvent.click(trigger);

    const items = screen.getAllByTestId('dropdown-item');

    await waitFor(() => {
      expect(items[0]).toHaveFocus();
    });
  });

  it('should render divider between items', () => {
    render(<DropdownTestComponent />);

    const trigger = screen.getByRole('button', { name: /open menu/i });
    fireEvent.click(trigger);

    expect(screen.getByTestId('dropdown-divider')).toBeInTheDocument();
  });

  it('should toggle dropdown on trigger click', async () => {
    render(<DropdownTestComponent />);

    const trigger = screen.getByRole('button', { name: /open menu/i });

    fireEvent.click(trigger);
    expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();

    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.queryByTestId('dropdown-menu')).not.toBeInTheDocument();
    });
  });

  it('should have correct ARIA attributes', () => {
    render(<DropdownTestComponent />);

    const trigger = screen.getByRole('button', { name: /open menu/i }).parentElement;

    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-haspopup', 'true');
  });
});
