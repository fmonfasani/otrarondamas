/**
 * Card Component Tests
 *
 * Comprehensive test suite for the Card component including:
 * - Rendering and content
 * - All variants
 * - Interactive state
 * - Event handlers and accessibility
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Card } from './Card';

describe('Card Component', () => {
  // ========================================================================
  // Basic Rendering Tests
  // ========================================================================

  it('should render a card element', () => {
    render(<Card data-testid="test-card">Card content</Card>);
    const card = screen.getByTestId('test-card');
    expect(card).toBeInTheDocument();
  });

  it('should render with children', () => {
    render(
      <Card>
        <h3>Title</h3>
        <p>Content</p>
      </Card>,
    );

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('should render text content', () => {
    render(<Card>Card text</Card>);
    expect(screen.getByText('Card text')).toBeInTheDocument();
  });

  // ========================================================================
  // Variant Tests
  // ========================================================================

  it('should have elevated variant by default', () => {
    render(<Card data-testid="test-card">Content</Card>);
    const card = screen.getByTestId('test-card');
    expect(card.className).toMatch(/shadow-lg/);
  });

  it('should apply elevated variant styles', () => {
    render(
      <Card variant="elevated" data-testid="test-card">
        Elevated
      </Card>,
    );
    const card = screen.getByTestId('test-card');
    expect(card.className).toMatch(/bg-brand-surface/);
    expect(card.className).toMatch(/shadow-lg/);
  });

  it('should apply outlined variant styles', () => {
    render(
      <Card variant="outlined" data-testid="test-card">
        Outlined
      </Card>,
    );
    const card = screen.getByTestId('test-card');
    expect(card.className).toMatch(/border/);
  });

  it('should apply filled variant styles', () => {
    render(
      <Card variant="filled" data-testid="test-card">
        Filled
      </Card>,
    );
    const card = screen.getByTestId('test-card');
    expect(card.className).toMatch(/bg-brand-mutedSurface/);
  });

  // ========================================================================
  // Padding/Spacing Tests
  // ========================================================================

  it('should have default padding', () => {
    render(<Card data-testid="test-card">Content</Card>);
    const card = screen.getByTestId('test-card');
    expect(card.className).toMatch(/p-4/);
  });

  it('should have rounded corners', () => {
    render(<Card data-testid="test-card">Content</Card>);
    const card = screen.getByTestId('test-card');
    expect(card.className).toMatch(/rounded-lg/);
  });

  // ========================================================================
  // Interactive State Tests
  // ========================================================================

  it('should not be interactive by default', () => {
    render(<Card data-testid="test-card">Content</Card>);
    const card = screen.getByTestId('test-card');
    expect(card).not.toHaveAttribute('tabIndex');
  });

  it('should have button role when interactive', () => {
    render(
      <Card interactive data-testid="test-card">
        Click me
      </Card>,
    );
    const card = screen.getByTestId('test-card');
    expect(card).toHaveAttribute('role', 'button');
  });

  it('should be focusable when interactive', () => {
    render(
      <Card interactive data-testid="test-card">
        Click me
      </Card>,
    );
    const card = screen.getByTestId('test-card');
    expect(card).toHaveAttribute('tabIndex', '0');
  });

  it('should have region role when not interactive', () => {
    render(<Card data-testid="test-card">Content</Card>);
    const card = screen.getByTestId('test-card');
    expect(card).toHaveAttribute('role', 'region');
  });

  it('should apply interactive styling', () => {
    render(
      <Card interactive data-testid="test-card">
        Interactive
      </Card>,
    );
    const card = screen.getByTestId('test-card');
    expect(card.className).toMatch(/cursor-pointer/);
  });

  // ========================================================================
  // Event Handler Tests
  // ========================================================================

  it('should handle click events', () => {
    const handleClick = jest.fn();
    render(
      <Card interactive onClick={handleClick} data-testid="test-card">
        Click me
      </Card>,
    );

    const card = screen.getByTestId('test-card');
    fireEvent.click(card);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should handle click events on non-interactive cards', () => {
    const handleClick = jest.fn();
    render(
      <Card onClick={handleClick} data-testid="test-card">
        Click me
      </Card>,
    );

    const card = screen.getByTestId('test-card');
    fireEvent.click(card);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  // ========================================================================
  // CSS Class Tests
  // ========================================================================

  it('should apply custom className', () => {
    render(
      <Card className="custom-class" data-testid="test-card">
        Custom
      </Card>,
    );
    const card = screen.getByTestId('test-card');
    expect(card.className).toMatch(/custom-class/);
  });

  it('should merge variant and custom classes', () => {
    render(
      <Card variant="outlined" className="extra-class" data-testid="test-card">
        Content
      </Card>,
    );
    const card = screen.getByTestId('test-card');
    expect(card.className).toMatch(/border/);
    expect(card.className).toMatch(/extra-class/);
  });

  // ========================================================================
  // Complex Content Tests
  // ========================================================================

  it('should render complex nested content', () => {
    render(
      <Card data-testid="test-card">
        <div>
          <h3>Title</h3>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </div>
      </Card>,
    );

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('should render multiple cards', () => {
    render(
      <>
        <Card data-testid="card-1">Card 1</Card>
        <Card data-testid="card-2">Card 2</Card>
        <Card data-testid="card-3">Card 3</Card>
      </>,
    );

    expect(screen.getByTestId('card-1')).toBeInTheDocument();
    expect(screen.getByTestId('card-2')).toBeInTheDocument();
    expect(screen.getByTestId('card-3')).toBeInTheDocument();
  });

  // ========================================================================
  // Ref Tests
  // ========================================================================

  it('should forward ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <Card ref={ref} data-testid="test-card">
        Content
      </Card>,
    );

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current?.textContent).toContain('Content');
  });
});
