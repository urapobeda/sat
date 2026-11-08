"use client";

import katex from "katex";
import { Fragment, type ReactNode } from "react";
import { decodeRichTable, type RichTable } from "@/lib/questionRichText";

/**
 * Renders question text the way the Math import writes it:
 *   - inline math   \( ... \)      -> KaTeX
 *   - display math  \[ ... \]      -> KaTeX on its own line
 *   - Markdown pipe tables          -> <table>
 *   - *italic*
 *   - [[img:0]] on its own line     -> the question's figure (stem graphs/diagrams)
 * Money like "$125" is plain text; $...$ is never treated as math.
 */
type MathTextProps = {
  className?: string;
  imageAlt?: string;
  images?: string[];
  inline?: boolean;
  text: string;
};

type Block =
  | { kind: "paragraph"; text: string }
  | { kind: "display"; tex: string }
  | { kind: "table"; rows: string[][]; header: boolean }
  | { kind: "rich-table"; table: RichTable }
  | { kind: "image"; index: number };

export function MathText({ className, imageAlt = "Figure", images = [], inline = false, text }: MathTextProps) {
  if (inline) {
    return <span className={className}>{renderInline(text)}</span>;
  }

  const blocks = parseBlocks(text ?? "");

  return (
    <div className={["math-text space-y-3", className].filter(Boolean).join(" ")}>
      {blocks.map((block, index) => {
        if (block.kind === "image") {
          const src = images[block.index];
          return src ? (
            // eslint-disable-next-line @next/next/no-img-element -- figures come from Supabase Storage at their natural size
            <img
              alt={`${imageAlt} ${block.index + 1}`}
              className="mx-auto block h-auto max-h-[420px] w-auto max-w-full"
              key={index}
              src={src}
            />
          ) : null;
        }

        if (block.kind === "display") {
          return <div className="overflow-x-auto py-1 text-center" dangerouslySetInnerHTML={{ __html: renderTex(block.tex, true) }} key={index} />;
        }

        if (block.kind === "table") {
          return <MathTable header={block.header} key={index} rows={block.rows} />;
        }
        if (block.kind === "rich-table") {
          return <SourceTable key={index} table={block.table} />;
        }

        return (
          <p className="whitespace-pre-line" key={index}>
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}

function SourceTable({ table }: { table: RichTable }) {
  return (
    <div className="overflow-x-auto">
      <table className="mx-auto border-collapse text-center">
        {table.caption ? <caption className="mb-2">{renderInline(table.caption)}</caption> : null}
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => {
                const Cell = cell.header ? "th" : "td";
                return <Cell className="border border-current px-4 py-1.5" colSpan={cell.colspan} key={j} rowSpan={cell.rowspan}>{renderInline(cell.text)}</Cell>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MathTable({ header, rows }: { header: boolean; rows: string[][] }) {
  const [head, ...body] = header ? rows : [null, ...rows];

  return (
    <div className="overflow-x-auto">
      <table className="mx-auto border-collapse text-center">
        {head ? (
          <thead>
            <tr>
              {head.map((cell, index) => (
                <th className="border border-current px-4 py-1.5 font-semibold" key={index} scope="col">
                  {renderInline(cell)}
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {body.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {(row ?? []).map((cell, index) => (
                <td className="border border-current px-4 py-1.5" key={index}>
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let paragraph: string[] = [];

  const flush = () => {
    const joined = paragraph.join("\n").trim();
    if (joined) blocks.push({ kind: "paragraph", text: joined });
    paragraph = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();

    const richTable = trimmed.match(/^\[\[table:([A-Za-z0-9+/=]+)\]\]$/);
    if (richTable) {
      const table = decodeRichTable(richTable[1]);
      if (table) {
        flush();
        blocks.push({ kind: "rich-table", table });
        continue;
      }
    }

    const image = trimmed.match(/^\[\[img:(\d+)\]\]$/);
    if (image) {
      flush();
      blocks.push({ kind: "image", index: Number(image[1]) });
      continue;
    }

    if (trimmed.startsWith("\\[")) {
      flush();
      const tex: string[] = [trimmed.slice(2)];
      while (!tex[tex.length - 1].includes("\\]") && i + 1 < lines.length) {
        i += 1;
        tex.push(lines[i]);
      }
      const joined = tex.join("\n");
      const end = joined.lastIndexOf("\\]");
      blocks.push({ kind: "display", tex: end >= 0 ? joined.slice(0, end) : joined });
      const rest = end >= 0 ? joined.slice(end + 2).trim() : "";
      if (rest) paragraph.push(rest);
      continue;
    }

    if (trimmed.startsWith("|")) {
      flush();
      const tableLines = [trimmed];
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith("|")) {
        i += 1;
        tableLines.push(lines[i].trim());
      }
      const isDivider = (row: string) => /^\|?[\s:|-]+\|?$/.test(row) && row.includes("-");
      const header = tableLines.length > 1 && isDivider(tableLines[1]);
      const rows = tableLines.filter((row) => !isDivider(row)).map(splitRow);
      blocks.push({ kind: "table", rows, header });
      continue;
    }

    if (!trimmed) {
      flush();
      continue;
    }

    paragraph.push(line);
  }

  flush();
  return blocks;
}

function splitRow(row: string) {
  // split on | that is not inside \( ... \) (absolute values like \(|x|\) stay intact)
  const cells: string[] = [];
  let depth = 0;
  let current = "";
  const body = row.replace(/^\|/, "").replace(/\|$/, "");

  for (let i = 0; i < body.length; i += 1) {
    if (body.startsWith("\\(", i)) depth += 1;
    if (body.startsWith("\\)", i)) depth = Math.max(0, depth - 1);
    if (body[i] === "|" && depth === 0) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += body[i];
  }

  cells.push(current.trim());
  return cells;
}

function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]|\[\[(png|asset):(\d+):(\d+):([^\s\]]+)\]\]/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text ?? "")) !== null) {
    if (match.index > last) parts.push(...renderEmphasis(text.slice(last, match.index), parts.length));
    if (match[3]) {
      const width = Number(match[4]);
      const height = Number(match[5]);
      const payload = match[6];
      const source = match[3] === "png" && /^iVBORw0KGgo[A-Za-z0-9+/=]*$/.test(payload)
        ? `data:image/png;base64,${payload}`
        : match[3] === "asset" && /^https:\/\/[^\s\]]+$/.test(payload) ? payload : null;
      if (source && width > 0 && width <= 10000 && height > 0 && height <= 10000) {
        parts.push(
          // eslint-disable-next-line @next/next/no-img-element -- inline formula from Storage; legacy embedded PNGs remain readable
          <img alt="Formula or figure" className="inline-block h-auto max-w-full align-middle" height={height} key={`p${parts.length}`} src={source} width={width} />
        );
      }
    } else {
      const tex = match[1] ?? match[2];
      parts.push(<span dangerouslySetInnerHTML={{ __html: renderTex(tex, match[2] !== undefined) }} key={`m${parts.length}`} />);
    }
    last = pattern.lastIndex;
  }

  if (last < (text ?? "").length) parts.push(...renderEmphasis(text.slice(last), parts.length));
  return parts;
}

function renderEmphasis(text: string, offset: number): ReactNode[] {
  return text.split(/(\*[^*\n]+\*)/g).map((piece, index) =>
    /^\*[^*\n]+\*$/.test(piece) ? (
      <em key={`e${offset}-${index}`}>{piece.slice(1, -1)}</em>
    ) : (
      <Fragment key={`t${offset}-${index}`}>{piece}</Fragment>
    )
  );
}

const texCache = new Map<string, string>();

function renderTex(tex: string, displayMode: boolean) {
  const key = `${displayMode ? "D" : "I"}${tex}`;
  const cached = texCache.get(key);
  if (cached) return cached;

  const html = katex.renderToString(tex, {
    displayMode,
    output: "htmlAndMathml",
    strict: "ignore",
    throwOnError: false,
    trust: false
  });
  texCache.set(key, html);
  return html;
}
