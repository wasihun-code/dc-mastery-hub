import React from 'react';
import CodeBlock from '../components/CodeBlock';

export function renderWithCode(text) {
  if (!text) return null;
  
  // Split on triple backticks to isolate code blocks
  const parts = text.split(/(```[\s\S]*?```)/);
  
  return parts.map((part, index) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      return <CodeBlock key={index} code={part} inline={false} />;
    }
    
    // For normal text, we split by newlines and add <br/> to maintain spacing
    const textLines = part.split('\n');
    return (
      <span key={index}>
        {textLines.map((line, lineIndex) => (
          <React.Fragment key={lineIndex}>
            {line}
            {lineIndex < textLines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </span>
    );
  });
}
