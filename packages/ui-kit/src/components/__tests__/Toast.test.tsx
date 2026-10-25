import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ToastProvider } from '../../contexts/ToastContext';
import { ToastContainer } from '../Toast';
import { useToast } from '../../hooks/useToast';

// Test component wrapper
const ToastTestWrapper: React.FC = () => {
  const { toast } = useToast();

  return (
    <div>
      <button onClick={() => toast('Success message', 'success')}>Show Success</button>
      <button onClick={() => toast('Error message', 'error')}>Show Error</button>
      <button onClick={() => toast('Info message', 'info')}>Show Info</button>
      <button onClick={() => toast('Warning message', 'warning')}>Show Warning</button>
      <button onClick={() => toast('Short toast', 'success', 500)}>Show Short Duration</button>
      <button onClick={() => toast('Top Left', 'success', 3000, 'top-left')}>Top Left</button>
      <button onClick={() => toast('Top Center', 'success', 3000, 'top-center')}>Top Center</button>
      <button onClick={() => toast('Bottom Right', 'success', 3000, 'bottom-right')}>Bottom Right</button>
    </div>
  );
};

describe('Toast Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should render toast with success type', () => {
    render(
      <ToastProvider>
        <ToastTestWrapper />
        <ToastContainer />
      </ToastProvider>
    );

    const button = screen.getByRole('button', { name: /show success/i });
    fireEvent.click(button);

    expect(screen.getByText('Success message')).toBeInTheDocument();
  });

  it('should render toast with error type', () => {
    render(
      <ToastProvider>
        <ToastTestWrapper />
        <ToastContainer />
      </ToastProvider>
    );

    const button = screen.getByRole('button', { name: /show error/i });
    fireEvent.click(button);

    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('should render toast with info type', () => {
    render(
      <ToastProvider>
        <ToastTestWrapper />
        <ToastContainer />
      </ToastProvider>
    );

    const button = screen.getByRole('button', { name: /show info/i });
    fireEvent.click(button);

    expect(screen.getByText('Info message')).toBeInTheDocument();
  });

  it('should render toast with warning type', () => {
    render(
      <ToastProvider>
        <ToastTestWrapper />
        <ToastContainer />
      </ToastProvider>
    );

    const button = screen.getByRole('button', { name: /show warning/i });
    fireEvent.click(button);

    expect(screen.getByText('Warning message')).toBeInTheDocument();
  });

  it('should auto-dismiss toast after duration', () => {
    render(
      <ToastProvider>
        <ToastTestWrapper />
        <ToastContainer />
      </ToastProvider>
    );

    const button = screen.getByRole('button', { name: /show short duration/i });
    fireEvent.click(button);

    expect(screen.getByText('Short toast')).toBeInTheDocument();

    jest.advanceTimersByTime(500);

    expect(screen.queryByText('Short toast')).not.toBeInTheDocument();
  });

  it('should remove toast when dismiss button is clicked', () => {
    render(
      <ToastProvider>
        <ToastTestWrapper />
        <ToastContainer />
      </ToastProvider>
    );

    const button = screen.getByRole('button', { name: /show success/i });
    fireEvent.click(button);

    expect(screen.getByText('Success message')).toBeInTheDocument();

    const dismissButtons = screen.getAllByLabelText('Dismiss toast');
    fireEvent.click(dismissButtons[0]);

    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
  });

  it('should render multiple toasts', () => {
    render(
      <ToastProvider>
        <ToastTestWrapper />
        <ToastContainer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /show success/i }));
    fireEvent.click(screen.getByRole('button', { name: /show error/i }));
    fireEvent.click(screen.getByRole('button', { name: /show info/i }));

    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByText('Info message')).toBeInTheDocument();
  });

  it('should enforce max toasts limit', () => {
    render(
      <ToastProvider maxToasts={2}>
        <ToastTestWrapper />
        <ToastContainer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /show success/i }));
    fireEvent.click(screen.getByRole('button', { name: /show error/i }));
    fireEvent.click(screen.getByRole('button', { name: /show info/i }));

    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByText('Info message')).toBeInTheDocument();
  });

  it('should position toast at top-left', () => {
    render(
      <ToastProvider>
        <ToastTestWrapper />
        <ToastContainer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /top left/i }));

    const container = screen.getByLabelText('Toast notifications - top-left');
    expect(container).toHaveClass('top-4', 'left-4');
  });

  it('should position toast at top-center', () => {
    render(
      <ToastProvider>
        <ToastTestWrapper />
        <ToastContainer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /top center/i }));

    const container = screen.getByLabelText('Toast notifications - top-center');
    expect(container).toHaveClass('top-4', 'left-1/2', '-translate-x-1/2');
  });

  it('should position toast at bottom-right', () => {
    render(
      <ToastProvider>
        <ToastTestWrapper />
        <ToastContainer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /bottom right/i }));

    const container = screen.getByLabelText('Toast notifications - bottom-right');
    expect(container).toHaveClass('bottom-4', 'right-4');
  });

  it('should have aria-live attribute for accessibility', () => {
    render(
      <ToastProvider>
        <ToastTestWrapper />
        <ToastContainer />
      </ToastProvider>
    );

    const button = screen.getByRole('button', { name: /show success/i });
    fireEvent.click(button);

    const toastStatus = screen.getByRole('status');
    expect(toastStatus).toHaveAttribute('aria-live', 'polite');
  });
});
