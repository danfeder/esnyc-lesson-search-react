import React, { useState, useEffect } from 'react';

// Test component with intentional issues for Claude to catch
export const TestComponent: React.FC = () => {
  const [data, setData] = useState<any>(null); // Issue 1: Using 'any' type
  const [count, setCount] = useState(0);

  // Issue 2: console.log statement (should use logger.debug)
  console.log('TestComponent rendered');

  // Issue 3: useEffect with missing dependency
  useEffect(() => {
    fetchData();
  }, []); // Missing 'count' dependency

  // Issue 4: No error handling
  const fetchData = async () => {
    const response = await fetch('/api/data');
    const json = await response.json();
    setData(json);
  };

  // Issue 5: Inefficient re-render (missing useCallback)
  const handleClick = () => {
    setCount(count + 1);
  };

  // Issue 6: Missing accessibility attributes
  return (
    <div onClick={handleClick}>
      <h1>Test Component</h1>
      <p>Count: {count}</p>
      {/* Issue 7: Missing alt text */}
      <img src="/test.png" />
      {/* Issue 8: Non-semantic button */}
      <div className="button">Click me</div>
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
};

// Issue 9: Missing proper TypeScript interface
interface Props {
  items: any[]; // Using any[] instead of proper type
}

// Issue 10: Attempting to add a 12th filter (violates 11 filter rule)
export const EXTRA_FILTER = {
  id: 'extra_filter',
  name: 'Extra Filter That Should Not Exist',
  type: 'single',
};
