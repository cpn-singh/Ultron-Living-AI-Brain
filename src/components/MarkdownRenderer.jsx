import React, { useState } from 'react';
import { Copy, Check, Code } from 'lucide-react';

export default function MarkdownRenderer({ content }) {
  if (!content) return null;

  // Split content by code blocks ` ```lang ... ``` `
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const textBefore = content.substring(lastIndex, match.index);
    if (textBefore) {
      parts.push({ type: 'text', text: textBefore });
    }
    parts.push({
      type: 'codeblock',
      language: match[1] || 'code',
      code: match[2].trim(),
    });
    lastIndex = match.index + match[0].length;
  }

  const remainingText = content.substring(lastIndex);
  if (remainingText) {
    parts.push({ type: 'text', text: remainingText });
  }

  return (
    <div className="flex flex-col gap-2 font-sans text-rose-100">
      {parts.map((part, index) => {
        if (part.type === 'codeblock') {
          return <CodeBlockItem key={index} language={part.language} code={part.code} />;
        }
        return <FormattedTextPart key={index} text={part.text} />;
      })}
    </div>
  );
}

function CodeBlockItem({ language, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2 rounded-xl bg-[#090d16] border border-rose-900/50 overflow-hidden font-mono text-xs shadow-lg">
      {/* Code Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-black/60 border-b border-rose-900/40 text-[11px]">
        <span className="text-rose-400 font-semibold flex items-center gap-1.5 uppercase tracking-wider">
          <Code className="w-3.5 h-3.5 text-rose-500" /> {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-rose-300/70 hover:text-rose-200 px-2 py-0.5 rounded hover:bg-rose-900/40 transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {/* Code Content */}
      <pre className="p-3 overflow-x-auto text-rose-200/90 leading-relaxed text-[11px] font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function FormattedTextPart({ text }) {
  const lines = text.split('\n');

  return (
    <div className="flex flex-col gap-1 leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        // Headings
        if (line.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-sm font-bold text-rose-400 mt-2 mb-0.5 border-b border-rose-900/30 pb-0.5">
              {parseInlineFormatting(line.slice(4))}
            </h3>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h2 key={idx} className="text-base font-bold text-rose-300 mt-2 mb-1">
              {parseInlineFormatting(line.slice(3))}
            </h2>
          );
        }
        if (line.startsWith('# ')) {
          return (
            <h1 key={idx} className="text-lg font-bold text-rose-200 mt-2 mb-1">
              {parseInlineFormatting(line.slice(2))}
            </h1>
          );
        }

        // Bullet Lists
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2 my-0.5 text-xs text-rose-200/90">
              <span className="text-rose-500 font-bold mt-0.5">•</span>
              <span>{parseInlineFormatting(line.slice(2))}</span>
            </div>
          );
        }

        // Numbered Lists
        const numMatch = line.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2 my-0.5 text-xs text-rose-200/90">
              <span className="text-rose-400 font-mono text-[11px] font-bold">{numMatch[1]}.</span>
              <span>{parseInlineFormatting(numMatch[2])}</span>
            </div>
          );
        }

        // Standard Paragraph
        return (
          <p key={idx} className="text-xs sm:text-sm text-rose-100/90 leading-relaxed">
            {parseInlineFormatting(line)}
          </p>
        );
      })}
    </div>
  );
}

function parseInlineFormatting(text) {
  // Replace bold **text**, italic *text*, inline `code`
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-rose-200">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="italic text-rose-300/90">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="bg-black/60 text-rose-300 font-mono text-[11px] px-1.5 py-0.5 rounded border border-rose-900/40">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
