import React from 'react';

export default function CodeBlock({ code, inline = false }) {
  // Strip markdown code fences if present
  const cleanCode = code
    .replace(/^```(python)?\n?/g, '')
    .replace(/\n?```$/g, '');

  if (inline) {
    return <code className="inline-code">{cleanCode}</code>;
  }

  return (
    <pre>
      <code className="code-block">{cleanCode}</code>
    </pre>
  );
}
