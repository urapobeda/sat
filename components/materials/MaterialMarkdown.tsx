"use client";
import { memo } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { safeMarkdownUrl } from "@/lib/courseMaterials";
const remarkPlugins=[remarkGfm,remarkMath];
export const MaterialMarkdown=memo(function MaterialMarkdown({body}:{body:string}) {
  return <div className="material-markdown min-w-0 break-words text-[16px] leading-8 text-slate-800 [&>*+*]:mt-4 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-200 [&_blockquote]:pl-4 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-slate-50 [&_pre]:p-4 [&_code]:break-normal [&_.katex-display]:overflow-x-auto">
    <Markdown remarkPlugins={remarkPlugins} rehypePlugins={[[rehypeKatex,{trust:false,strict:'ignore',maxExpand:1000,maxSize:20}]]} skipHtml urlTransform={safeMarkdownUrl} components={{
      a:({href,children})=>href?<a href={href} className="text-blue-600 underline" target={href.startsWith('http')?'_blank':undefined} rel="noopener noreferrer">{children}</a>:<span>{children}</span>,
      img:({src,alt})=>typeof src==='string'&&src?(
        // eslint-disable-next-line @next/next/no-img-element -- teacher markdown can reference external images
        <img src={src} alt={alt??''} loading="lazy" referrerPolicy="no-referrer" className="block h-auto max-w-full rounded-lg" />
      ):null,
      table:({children})=><div className="overflow-x-auto"><table className="border-collapse text-sm [&_td]:border [&_td]:border-slate-200 [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-slate-200 [&_th]:px-3 [&_th]:py-2">{children}</table></div>
    }}>{body}</Markdown>
  </div>;
});
