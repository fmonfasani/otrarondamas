import type { Meta, StoryObj } from '@storybook/react';
import Card, { CardHeader, CardBody, CardFooter } from './Card';
import Button from './Button';

const meta = {
  title: 'Components/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: <p>Default card content</p>,
  },
};

export const Elevated: Story = {
  args: {
    children: <p>Elevated card with shadow</p>,
    variant: 'elevated',
  },
};

export const Outlined: Story = {
  args: {
    children: <p>Outlined card with border</p>,
    variant: 'outlined',
  },
};

export const WithHeader: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <h3 className="font-bold text-lg">Card Title</h3>
      </CardHeader>
      <CardBody>
        <p>This is the card body content.</p>
      </CardBody>
    </Card>
  ),
};

export const WithFooter: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <h3 className="font-bold text-lg">Card Title</h3>
      </CardHeader>
      <CardBody>
        <p>This is the card body content.</p>
      </CardBody>
      <CardFooter>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" size="sm">Cancel</Button>
          <Button size="sm">Save</Button>
        </div>
      </CardFooter>
    </Card>
  ),
};

export const PaddingSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Card padding="sm">
        <p>Small padding</p>
      </Card>
      <Card padding="md">
        <p>Medium padding</p>
      </Card>
      <Card padding="lg">
        <p>Large padding</p>
      </Card>
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card variant="default">
        <CardHeader>
          <h4 className="font-bold">Default</h4>
        </CardHeader>
        <CardBody>
          <p className="text-sm">Default card style</p>
        </CardBody>
      </Card>

      <Card variant="elevated">
        <CardHeader>
          <h4 className="font-bold">Elevated</h4>
        </CardHeader>
        <CardBody>
          <p className="text-sm">Elevated with shadow</p>
        </CardBody>
      </Card>

      <Card variant="outlined">
        <CardHeader>
          <h4 className="font-bold">Outlined</h4>
        </CardHeader>
        <CardBody>
          <p className="text-sm">Outlined with border</p>
        </CardBody>
      </Card>
    </div>
  ),
};
