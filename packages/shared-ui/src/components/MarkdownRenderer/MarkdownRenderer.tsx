'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Components } from 'react-markdown';
import 'katex/dist/katex.min.css';

const ReactMarkdown = dynamic(
  () => import('react-markdown').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse">
        <div className="h-4 w-3/4 rounded bg-gray-200" />
        <div className="mt-2 h-4 w-1/2 rounded bg-gray-200" />
      </div>
    ),
  }
);

export interface MarkdownRendererProps {
  /** Markdown content to render */
  content: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to enable KaTeX math support (default: true) */
  enableMath?: boolean;
  /** Whether to enable syntax highlighting (default: true) */
  enableHighlight?: boolean;
}

// Custom components for markdown elements
const components: Components = {
  // Headings
  h1: ({ children }) => (
    <h1 className="mb-4 mt-6 text-2xl font-bold text-gray-900 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-3 mt-5 text-xl font-semibold text-gray-900 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-4 text-lg font-semibold text-gray-900 first:mt-0">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mb-2 mt-3 text-base font-semibold text-gray-900 first:mt-0">
      {children}
    </h4>
  ),

  // Paragraphs
  p: ({ children }) => <p className="mb-4 leading-relaxed last:mb-0">{children}</p>,

  // Lists
  ul: ({ children }) => (
    <ul className="mb-4 ml-6 list-disc space-y-1 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 ml-6 list-decimal space-y-1 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,

  // Links
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#003865] underline hover:text-[#1e5d8f]"
    >
      {children}
    </a>
  ),

  // Blockquotes
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-4 border-[#003865] bg-gray-50 py-2 pl-4 italic text-gray-700">
      {children}
    </blockquote>
  ),

  // Code blocks and inline code
  code: ({ className, children, ...props }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code
          className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm text-[#003865]"
          style={{ fontVariantLigatures: 'none' }}
        >
          {children}
        </code>
      );
    }
    // Block code - handled by pre
    return (
      <code className={className} style={{ fontVariantLigatures: 'none' }} {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre
      className="my-4 overflow-x-auto rounded-lg bg-gray-900 p-4 font-mono text-sm"
      style={{ fontVariantLigatures: 'none' }}
    >
      {children}
    </pre>
  ),

  // Tables
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto">
      <table className="min-w-full border-collapse border border-gray-200">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-gray-200 last:border-0">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="border border-gray-200 px-4 py-2 text-left font-semibold text-gray-900">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-gray-200 px-4 py-2 text-gray-700">{children}</td>
  ),

  // Horizontal rule
  hr: () => <hr className="my-6 border-gray-200" />,

  // Strong and emphasis
  strong: ({ children }) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,

  // Images
  img: ({ src, alt }) => (
    <img
      src={src}
      alt={alt || ''}
      className="my-4 max-w-full rounded-lg"
      loading="lazy"
    />
  ),
};

export function MarkdownRenderer({
  content,
  className = '',
  enableMath = true,
  enableHighlight = true,
}: MarkdownRendererProps) {
  return (
    <div className={`markdown-content text-gray-700 ${className}`}>
      <MarkdownRendererWithPlugins
        content={content}
        enableMath={enableMath}
        enableHighlight={enableHighlight}
      />
    </div>
  );
}

// Plugin types
interface PluginState {
  remarkGfm: typeof import('remark-gfm').default | null;
  remarkMath: typeof import('remark-math').default | null;
  rehypeHighlight: typeof import('rehype-highlight').default | null;
  rehypeKatex: typeof import('rehype-katex').default | null;
  rehypeSanitize: typeof import('rehype-sanitize').default | null;
  defaultSchema: typeof import('hast-util-sanitize').defaultSchema | null;
}

// Component that handles async plugin loading
function MarkdownRendererWithPlugins({
  content,
  enableMath,
  enableHighlight,
}: {
  content: string;
  enableMath: boolean;
  enableHighlight: boolean;
}) {
  const [plugins, setPlugins] = useState<PluginState>({
    remarkGfm: null,
    remarkMath: null,
    rehypeHighlight: null,
    rehypeKatex: null,
    rehypeSanitize: null,
    defaultSchema: null,
  });

  useEffect(() => {
    Promise.all([
      import('remark-gfm'),
      import('remark-math'),
      import('rehype-highlight'),
      import('rehype-katex'),
      import('rehype-sanitize'),
      import('hast-util-sanitize'),
    ]).then(([gfm, math, highlight, katex, sanitize, hastSanitize]) => {
      setPlugins({
        remarkGfm: gfm.default,
        remarkMath: math.default,
        rehypeHighlight: highlight.default,
        rehypeKatex: katex.default,
        rehypeSanitize: sanitize.default,
        defaultSchema: hastSanitize.defaultSchema,
      });
    });
  }, []);

  const isLoading = !plugins.remarkGfm || !plugins.rehypeSanitize || !plugins.defaultSchema;

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 w-3/4 rounded bg-gray-200" />
        <div className="mt-2 h-4 w-1/2 rounded bg-gray-200" />
      </div>
    );
  }

  // Custom sanitization schema that allows code highlighting and KaTeX classes
  const schema = plugins.defaultSchema!;
  const customSchema = {
    ...schema,
    tagNames: [
      ...(schema.tagNames || []),
      // KaTeX elements
      'math', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub',
      'msubsup', 'mfrac', 'mroot', 'msqrt', 'mtable', 'mtr', 'mtd',
      'mover', 'munder', 'munderover', 'mtext', 'mspace', 'annotation',
    ],
    attributes: {
      ...schema.attributes,
      // Allow className for syntax highlighting (hljs-*) and KaTeX
      span: ['className', 'style', 'ariaHidden'],
      // Allow hljs class on code elements
      code: ['className'],
      div: [...(schema.attributes?.div || []), 'className', 'style'],
      math: ['xmlns', 'display'],
      annotation: ['encoding'],
    },
  };

  // Build plugin arrays based on options
  const remarkPlugins: any[] = [plugins.remarkGfm!];
  const rehypePlugins: any[] = [[plugins.rehypeSanitize!, customSchema]];

  if (enableMath && plugins.remarkMath && plugins.rehypeKatex) {
    remarkPlugins.push(plugins.remarkMath);
    rehypePlugins.push(plugins.rehypeKatex);
  }

  if (enableHighlight && plugins.rehypeHighlight) {
    rehypePlugins.push(plugins.rehypeHighlight);
  }

  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      components={components}
    >
      {content}
    </ReactMarkdown>
  );
}
