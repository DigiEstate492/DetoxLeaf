// Rich blog posts are stored as blocks: {blocks:[{type,text|items|src,...}]}. Inline formatting uses a small,
// safe subset of Markdown: **bold**, *italic*, `code` and [link text](https://…). Nothing is ever rendered as raw HTML.

export const blockTypes=['p','h2','h3','quote','ul','ol','image','divider'];
export const textTypes=['p','h2','h3','quote'];
const limits={blocks:300,text:6000,items:60,item:1500,caption:300};
const safeImage=/^(\/[A-Za-z0-9._/-]+|https:\/\/[^\s"<>]+)$/;
const clip=(value,max)=>String(value??'').replace(/\r\n?/g,'\n').slice(0,max);

export function sanitizeBlocks(blocks){
  if(!Array.isArray(blocks))return [];
  const out=[];
  for(const raw of blocks.slice(0,limits.blocks)){
    const type=blockTypes.includes(raw?.type)?raw.type:'p';
    if(type==='divider'){out.push({type});continue;}
    if(type==='image'){const src=String(raw.src||'').trim();if(!safeImage.test(src))continue;out.push({type,src,alt:clip(raw.alt,limits.caption).trim(),caption:clip(raw.caption,limits.caption).trim()});continue;}
    if(type==='ul'||type==='ol'){const items=(Array.isArray(raw.items)?raw.items:String(raw.text||'').split('\n')).map(i=>clip(i,limits.item).replace(/\s+/g,' ').trim()).filter(Boolean).slice(0,limits.items);if(items.length)out.push({type,items});continue;}
    const text=type==='p'||type==='quote'?clip(raw.text,limits.text).replace(/[ \t]+\n/g,'\n').trim():clip(raw.text,300).replace(/\s+/g,' ').trim();
    if(text)out.push({type,text});
  }
  return out;
}

// Inline Markdown → plain text, for summaries, search and the section copy the database checks.
export const plainText=text=>String(text||'').replace(/\[([^\]]+)\]\((?:https?:\/\/|\/)[^)\s]*\)/g,'$1').replace(/\*\*([^*]+)\*\*/g,'$1').replace(/\*([^*]+)\*/g,'$1').replace(/`([^`]+)`/g,'$1');

// Older posts store sections of a heading plus paragraphs.
export function sectionsToBlocks(sections){
  const blocks=[];
  for(const s of Array.isArray(sections)?sections:[]){
    if(typeof s?.title==='string'&&s.title.trim())blocks.push({type:'h2',text:s.title.trim()});
    for(const p of Array.isArray(s?.paragraphs)?s.paragraphs:[])if(typeof p==='string'&&p.trim())blocks.push({type:'p',text:p.trim()});
  }
  return blocks;
}

// Section copy of a rich post: each main heading starts a section. Keeps search, read time and older code working.
export function blocksToSections(blocks){
  const sections=[];let current=null;
  const add=text=>{if(!text)return;if(!current){current={title:'',paragraphs:[]};sections.push(current);}current.paragraphs.push(text);};
  for(const b of blocks){
    if(b.type==='h2'){current={title:plainText(b.text),paragraphs:[]};sections.push(current);}
    else if(b.type==='p'||b.type==='quote'||b.type==='h3')add(plainText(b.text));
    else if(b.type==='ul'||b.type==='ol')add(b.items.map(plainText).join(' · '));
  }
  return sections;
}

export const bodyBlocks=body=>Array.isArray(body?.blocks)&&body.blocks.length?sanitizeBlocks(body.blocks):sectionsToBlocks(body?.sections);
export const wordCount=blocks=>blocks.reduce((n,b)=>n+plainText(b.text||(b.items||[]).join(' ')||b.caption||'').split(/\s+/).filter(Boolean).length,0);
export const hasReadableText=blocks=>blocks.some(b=>(b.type==='p'||b.type==='quote'||b.type==='ul'||b.type==='ol')&&wordCount([b])>0);

// Typing these at the start of an empty paragraph turns it into another block, as in Medium.
export function shortcut(text){
  const rules=[[/^#{2}\s/,'h2'],[/^#{3}\s/,'h3'],[/^#\s/,'h2'],[/^>\s/,'quote'],[/^[-*]\s/,'ul'],[/^1[.)]\s/,'ol']];
  if(/^(---|\*\*\*)$/.test(text))return {type:'divider'};
  for(const [re,type] of rules){const m=text.match(re);if(m)return {type,text:text.slice(m[0].length)};}
  return null;
}

// Inline Markdown → tokens. Links must be https://, http:// or a site path.
export function parseInline(text){
  const tokens=[];const re=/\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|`([^`\n]+)`|\[([^\]\n]+)\]\(((?:https?:\/\/|\/)[^)\s]*)\)/g;
  let last=0,m;const source=String(text||'');
  while((m=re.exec(source))){
    if(m.index>last)tokens.push({type:'text',text:source.slice(last,m.index)});
    if(m[1]!==undefined)tokens.push({type:'b',text:m[1]});
    else if(m[2]!==undefined)tokens.push({type:'i',text:m[2]});
    else if(m[3]!==undefined)tokens.push({type:'code',text:m[3]});
    else tokens.push({type:'link',text:m[4],href:m[5]});
    last=re.lastIndex;
  }
  if(last<source.length)tokens.push({type:'text',text:source.slice(last)});
  return tokens;
}
