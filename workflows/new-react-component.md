# Workflow: Add a New React Component

This workflow outlines the steps to add a new React component to the Next.js application.

## 1. Create the Component File

Create a new `.tsx` file for your component under `src/components/` or a relevant subdirectory (e.g., `src/components/ui/` for UI components, `src/components/dashboard/` for dashboard-specific components).

**Example:** For a new `MyButton` component, create `src/components/MyButton.tsx`.

```typescript
// src/components/MyButton.tsx

import React from 'react';

interface MyButtonProps {
  text: string;
  onClick: () => void;
}

const MyButton: React.FC<MyButtonProps> = ({ text, onClick }) => {
  return (
    <button
      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      onClick={onClick}
    >
      {text}
    </button>
  );
};

export default MyButton;
```

## 2. Implement Component Logic and Styling

*   Add the necessary React logic, state management, and props.
*   Apply styling using Tailwind CSS classes. Refer to existing components for styling conventions.

## 3. Add Tests (Recommended)

Create corresponding unit tests for your new component in `src/__tests__/` or a relevant subdirectory (e.g., `src/__tests__/components/`). Use Jest and React Testing Library.

**Example:** For `src/components/MyButton.tsx`, create `src/__tests__/components/MyButton.test.tsx`.

```typescript
// src/__tests__/components/MyButton.test.tsx

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MyButton from '@/components/MyButton';

describe('MyButton', () => {
  it('renders with the correct text', () => {
    render(<MyButton text="Click Me" onClick={() => {}} />);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<MyButton text="Click Me" onClick={handleClick} />);
    fireEvent.click(screen.getByText('Click Me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

Run tests:
```bash
npm test src/__tests__/components/MyButton.test.tsx
```

## 4. Run Linting and Type-Checking

Ensure your new code adheres to project standards and has no type errors.

```bash
npm run lint
npm run build # This also performs type-checking
```

## 5. Integrate and Verify

Import and use your new component in a relevant page or parent component. Run the development server to visually verify its functionality and appearance.

```bash
npm run dev
```