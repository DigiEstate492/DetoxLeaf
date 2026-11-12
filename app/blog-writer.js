"use client";
// Medium-style blog writer: a clean canvas of blocks, inline formatting, a settings panel and a live preview
// that uses the same renderer as the public article page.
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import ArticleBody from './article-body';
import {api} from './commerce/client';
import {blogCoverChoices,slugify,validateBlogPost} from '../lib/blog-editor.mjs';
import {bodyBlocks,shortcut,textTypes,wordCount} from '../lib/blog-blocks.mjs';

let nextId=0;const uid=()=>'b'+(++nextId);
const listTypes=['ul','ol'];
const editable=type=>textTypes.includes(type)||listTypes.includes(type);
const toEditorBlock=b=>({id:uid(),type:b.type,text:listTypes.includes(b.type)?b.items.join('\n'):b.text||'',src:b.src||'',alt:b.alt||'',caption:b.caption||''});
const fromEditorBlock=b=>b.type==='divider'?{type:'divider'}:b.type==='image'?{type:'image',src:b.src.trim(),alt:b.alt,caption:b.caption}:listTypes.includes(b.type)?{type:b.type,items:b.text.split('\n')}:{type:b.type,text:b.text};
const statusLabels={draft:'Draft',published:'Published',archived:'Hidden'};
const inserts=[['h2','Heading','H'],['h3','Subheading','h'],['quote','Quote','❝'],['ul','Bulleted list','•'],['ol','Numbered list','1.'],['image','Image','▣'],['divider','Divider','—']];

export function draftFromRow(row){
  const blocks=row?bodyBlocks(row.body).map(toEditorBlock):[];
  return {meta:{id:row?.id,title:row?.title||'',slug:row?.slug||'',slugEdited:Boolean(row),seo_description:row?.seo_description||'',cover_image:row?.cover_image||'',author_name:row?.author_name||'',status:row?.status||'draft'},blocks:blocks.length?blocks:[{id:uid(),type:'p',text:''}]};
}
const serialize=(meta,blocks,status=meta.status)=>({title:meta.title,slug:meta.slug,seo_description:meta.seo_description,cover_image:meta.cover_image,author_name:meta.author_name,status,blocks:blocks.map(fromEditorBlock)});

function AutoText({value,onChange,inputRef,className,...rest}){
  const local=useRef(null);
  useLayoutEffect(()=>{const el=local.current;if(el){el.style.height='auto';el.style.height=el.scrollHeight+'px';}},[value]);
  return <textarea rows={1} ref={el=>{local.current=el;if(inputRef)inputRef(el);}} className={className} value={value} onChange={e=>onChange(e.target.value,e.target)} {...rest}/>;
}

export default function BlogWriter({row,onClose,onSaved}){
  const [initial]=useState(()=>draftFromRow(row));
  const [{meta,blocks},setDoc]=useState(initial);
  const [mode,setMode]=useState('write'),[settings,setSettings]=useState(!row),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[menuFor,setMenuFor]=useState(null);
  const [saved,setSaved]=useState(()=>JSON.stringify(serialize(initial.meta,initial.blocks)));
  const refs=useRef({}),focusRequest=useRef(null),active=useRef(null),titleRef=useRef(null);
  const snapshot=JSON.stringify(serialize(meta,blocks));
  const dirty=saved!==snapshot;
  const words=wordCount(blocks.map(fromEditorBlock));

  useEffect(()=>{const warn=e=>{if(dirty){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
  useEffect(()=>{const r=focusRequest.current;if(!r)return;const el=refs.current[r.id];if(el){el.focus();const pos=r.pos==='end'?el.value.length:r.pos;try{el.setSelectionRange(pos,pos);}catch{}}focusRequest.current=null;});
  useEffect(()=>{if(!row)titleRef.current?.focus();},[row]);

  const setMeta=(key,value)=>setDoc(d=>({...d,meta:{...d.meta,[key]:value,...(key==='title'&&!d.meta.slugEdited?{slug:slugify(value)}:{})}}));
  const update=(id,patch)=>setDoc(d=>({...d,blocks:d.blocks.map(b=>b.id===id?{...b,...patch}:b)}));
  const focus=(id,pos=0)=>{focusRequest.current={id,pos};};
  function insertAfter(id,block,{focusIt=true}={}){const created={id:uid(),text:'',src:'',alt:'',caption:'',...block};setDoc(d=>{const i=d.blocks.findIndex(b=>b.id===id);const next=[...d.blocks];next.splice(i+1,0,created);return {...d,blocks:next};});if(focusIt)focus(created.id,0);return created.id;}
  const remove=id=>setDoc(d=>({...d,blocks:d.blocks.length>1?d.blocks.filter(b=>b.id!==id):[{id:uid(),type:'p',text:''}]}));

  function convert(block,type){
    setMenuFor(null);
    if(type==='divider'){update(block.id,{type:'divider',text:''});insertAfter(block.id,{type:'p'});return;}
    update(block.id,{type,text:type==='image'?'':block.text});if(type!=='image')focus(block.id,'end');
  }

  // Wrap the selection in Markdown markers, e.g. **bold**.
  function wrapSelection(before,after=before){
    const id=active.current,el=refs.current[id];if(!el)return;
    const {selectionStart:s,selectionEnd:e,value}=el;const chosen=value.slice(s,e)||(before==='['?'link text':'text');
    let insert=before+chosen+after;
    if(before==='['){const href=window.prompt('Link address (https://… or /page)','https://');if(!href)return;if(!/^(https?:\/\/|\/)\S+$/.test(href)){setMessage('Links must start with https:// or /');return;}insert='['+chosen+']('+href+')';}
    update(id,{text:value.slice(0,s)+insert+value.slice(e)});focus(id,s+insert.length);
  }

  function onKeyDown(event,block,index){
    const el=event.currentTarget,{selectionStart:s,selectionEnd:e,value}=el,mod=event.ctrlKey||event.metaKey;
    if(mod&&['b','i','k'].includes(event.key.toLowerCase())){event.preventDefault();const k=event.key.toLowerCase();wrapSelection(k==='b'?'**':k==='i'?'*':'[',k==='k'?')':undefined);return;}
    if(mod&&event.key.toLowerCase()==='s'){event.preventDefault();save();return;}
    if(event.key==='Enter'&&!event.shiftKey){
      if(listTypes.includes(block.type)){
        const lineStart=value.lastIndexOf('\n',s-1)+1,line=value.slice(lineStart,value.indexOf('\n',s)===-1?value.length:value.indexOf('\n',s));
        if(line.trim()===''&&s===value.length){event.preventDefault();update(block.id,{text:value.slice(0,Math.max(0,lineStart-1))});insertAfter(block.id,{type:'p'});}
        return;
      }
      event.preventDefault();update(block.id,{text:value.slice(0,s)});insertAfter(block.id,{type:'p',text:value.slice(e)});return;
    }
    if(event.key==='Backspace'&&s===0&&e===0){
      if(block.type!=='p'){event.preventDefault();update(block.id,{type:'p'});return;}
      const prev=blocks[index-1];
      if(prev&&editable(prev.type)){event.preventDefault();setDoc(d=>({...d,blocks:d.blocks.filter(b=>b.id!==block.id).map(b=>b.id===prev.id?{...b,text:b.text+value}:b)}));focus(prev.id,prev.text.length);return;}
      if(prev){event.preventDefault();remove(prev.id);return;}
      if(!value&&blocks.length>1){event.preventDefault();remove(block.id);const next=blocks[1];if(next)focus(next.id,0);}
      return;
    }
    if(event.key==='ArrowUp'&&s===0&&e===0){const prev=blocks.slice(0,index).reverse().find(b=>editable(b.type));if(prev){event.preventDefault();focus(prev.id,'end');setDoc(d=>({...d}));}else{event.preventDefault();titleRef.current?.focus();}return;}
    if(event.key==='ArrowDown'&&s===value.length){const next=blocks.slice(index+1).find(b=>editable(b.type));if(next){event.preventDefault();focus(next.id,0);setDoc(d=>({...d}));}}
  }

  function onChange(block,value){
    if(block.type==='p'){const rule=shortcut(value);if(rule){if(rule.type==='divider'){update(block.id,{type:'divider',text:''});insertAfter(block.id,{type:'p'});}else{update(block.id,{type:rule.type,text:rule.text});focus(block.id,'end');}return;}}
    update(block.id,{text:value});
  }

  // Pasting several paragraphs splits them into separate blocks.
  function onPaste(event,block){
    if(block.type!=='p')return;const text=event.clipboardData.getData('text/plain');const parts=text.replace(/\r\n?/g,'\n').split(/\n\s*\n/).map(p=>p.trim()).filter(Boolean);if(parts.length<2)return;
    event.preventDefault();const el=event.currentTarget,before=el.value.slice(0,el.selectionStart),after=el.value.slice(el.selectionEnd);
    const created=parts.slice(1).map((p,i)=>({id:uid(),type:'p',text:p+(i===parts.length-2?after:''),src:'',alt:'',caption:''}));
    setDoc(d=>{const i=d.blocks.findIndex(b=>b.id===block.id);const next=[...d.blocks];next[i]={...next[i],text:before+parts[0]};next.splice(i+1,0,...created);return {...d,blocks:next};});
    const last=created[created.length-1];focus(last.id,last.text.length-after.length);
  }

  async function save(status=meta.status){
    const post=serialize(meta,blocks,status);const check=validateBlogPost(post);
    if(check.error){setMessage(check.error);if(/title/i.test(check.error))titleRef.current?.focus();if(/address|cover/i.test(check.error))setSettings(true);return;}
    setBusy(true);setMessage('Saving…');
    try{const {record}=await api('/api/manage',{method:'POST',body:JSON.stringify({action:'blog_save',id:meta.id,post})});
      const next=draftFromRow(record);setDoc(d=>({meta:next.meta,blocks:d.blocks}));setSaved(JSON.stringify(serialize(next.meta,blocks)));
      setMessage(status==='published'?(meta.status==='published'?'Live post updated.':'Published — it is live on the blog.'):status==='archived'?'Hidden from the blog.':'Draft saved.');onSaved();}
    catch(error){setMessage(error.message);}finally{setBusy(false);}
  }
  async function destroy(){
    if(!meta.id||!window.confirm('Delete "'+(meta.title||'this post')+'" permanently? This cannot be undone. Use "Hide from blog" to take it down but keep it.'))return;
    setBusy(true);try{await api('/api/manage',{method:'POST',body:JSON.stringify({action:'blog_delete',id:meta.id})});setSaved(snapshot);onSaved();onClose();}catch(error){setMessage(error.message);setBusy(false);}
  }
  const close=()=>{if(dirty&&!window.confirm('You have unsaved changes. Leave without saving?'))return;onClose();};
  const toolbar=(before,after,label,title)=><button type="button" title={title} aria-label={title} onMouseDown={e=>e.preventDefault()} onClick={()=>wrapSelection(before,after)}>{label}</button>;

  const preview=<div className="writer-preview">
    <section className="screen-intro"><div className="section-wrap"><p className="eyebrow">THE DETOXLEAF JOURNAL</p><h1>{meta.title||'Untitled post'}</h1>{meta.seo_description&&<p>{meta.seo_description}</p>}</div></section>
    <article className="journal-article"><img className="journal-article-cover" src={meta.cover_image||'/media/wheatgrass-hero.png'} alt=""/><p className="eyebrow">DETOXLEAF JOURNAL · {Math.max(1,Math.round(words/200))} MIN READ</p>{meta.author_name&&<p className="journal-byline">By {meta.author_name}</p>}<ArticleBody body={{blocks:blocks.map(fromEditorBlock)}}/></article>
  </div>;

  return <div className="writer">
    <header className="writer-bar">
      <button type="button" className="writer-back" onClick={close}>← All posts</button>
      <span className={'blog-status blog-status-'+meta.status}>{statusLabels[meta.status]}</span>
      <span className="writer-state" role="status">{message||(dirty?'Unsaved changes':meta.id?'All changes saved':'')}</span>
      <div className="writer-mode" role="group" aria-label="Editor mode"><button type="button" aria-pressed={mode==='write'} onClick={()=>setMode('write')}>Write</button><button type="button" aria-pressed={mode==='preview'} onClick={()=>setMode('preview')}>Preview</button></div>
      <button type="button" className="writer-settings-toggle" aria-expanded={settings} onClick={()=>setSettings(!settings)}>Settings</button>
      <button type="button" className="button outline" disabled={busy} onClick={()=>save(meta.status==='published'?'published':'draft')}>{meta.status==='published'?'Save':'Save draft'}</button>
      <button type="button" className="button green" disabled={busy} onClick={()=>save('published')}>{meta.status==='published'?'Update':'Publish'}</button>
    </header>
    <div className={'writer-layout'+(settings?' with-settings':'')}>
      {mode==='preview'?preview:<div className="writer-canvas">
        <div className="writer-format" aria-label="Formatting">{toolbar('**','**','B','Bold (Ctrl+B)')}{toolbar('*','*','i','Italic (Ctrl+I)')}{toolbar('[',')','🔗','Link (Ctrl+K)')}<span>Tip: start a line with ## for a heading, &gt; for a quote, - for a list, --- for a divider.</span></div>
        <AutoText inputRef={el=>{titleRef.current=el;}} className="writer-title" value={meta.title} maxLength={140} placeholder="Title" aria-label="Title" onChange={v=>setMeta('title',v.replace(/\n/g,' '))} onKeyDown={e=>{if(e.key==='Enter'||e.key==='ArrowDown'&&e.currentTarget.selectionStart===e.currentTarget.value.length){e.preventDefault();const first=blocks.find(b=>editable(b.type));if(first){focus(first.id,0);setDoc(d=>({...d}));}}}}/>
        {blocks.map((block,index)=>{
          const empty=block.type==='p'&&!block.text;
          if(block.type==='divider')return <div key={block.id} className="writer-block writer-divider"><hr/><button type="button" aria-label="Remove divider" onClick={()=>remove(block.id)}>×</button></div>;
          if(block.type==='image')return <figure key={block.id} className="writer-block writer-image">
            {block.src?<><img src={block.src} alt={block.alt||''}/><input className="writer-caption" placeholder="Add a caption (optional)" maxLength={300} value={block.caption} onChange={e=>update(block.id,{caption:e.target.value})}/></>:<div className="writer-image-pick"><input autoFocus placeholder="Paste an image link: https://… or /media/photo.png — then press Enter" onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();const v=e.currentTarget.value.trim();if(/^(\/[A-Za-z0-9._/-]+|https:\/\/[^\s"<>]+)$/.test(v))update(block.id,{src:v});else setMessage('Image links must start with https:// or /');}}}/><div>{blogCoverChoices.map(src=><button type="button" key={src} onClick={()=>update(block.id,{src})}><img src={src} alt=""/></button>)}</div></div>}
            <button type="button" className="writer-image-remove" aria-label="Remove image" onClick={()=>remove(block.id)}>×</button>
          </figure>;
          return <div key={block.id} className={'writer-block writer-'+block.type}>
            {empty&&<div className="writer-insert"><button type="button" aria-label="Insert a block" aria-expanded={menuFor===block.id} onMouseDown={e=>e.preventDefault()} onClick={()=>setMenuFor(menuFor===block.id?null:block.id)}>+</button>{menuFor===block.id&&<div className="writer-insert-menu" role="menu">{inserts.map(([type,label,icon])=><button type="button" role="menuitem" key={type} onMouseDown={e=>e.preventDefault()} onClick={()=>convert(block,type)}><span aria-hidden="true">{icon}</span>{label}</button>)}</div>}</div>}
            <AutoText inputRef={el=>{refs.current[block.id]=el;}} value={block.text} aria-label={({p:'Paragraph',h2:'Heading',h3:'Subheading',quote:'Quote',ul:'Bulleted list, one item per line',ol:'Numbered list, one item per line'})[block.type]}
              placeholder={index===0&&empty?'Tell your story…':block.type==='h2'?'Heading':block.type==='h3'?'Subheading':block.type==='quote'?'Quote':listTypes.includes(block.type)?'List item — Enter for the next, Enter twice to finish':''}
              onFocus={()=>{active.current=block.id;}} onChange={v=>onChange(block,v)} onKeyDown={e=>onKeyDown(e,block,index)} onPaste={e=>onPaste(e,block)}/>
          </div>;
        })}
        <button type="button" className="writer-add" onClick={()=>{const last=blocks[blocks.length-1];insertAfter(last.id,{type:'p'});setDoc(d=>({...d}));}}>+ Add a paragraph</button>
        <p className="writer-count">{words} words · about {Math.max(1,Math.round(words/200))} min read</p>
      </div>}
      {settings&&<aside className="writer-settings" aria-label="Post settings">
        <h2>Post settings</h2>
        <label>Web address<span className="blog-slug"><span>/blog/</span><input maxLength={80} value={meta.slug} onChange={e=>setDoc(d=>({...d,meta:{...d.meta,slug:e.target.value,slugEdited:true}}))} onBlur={e=>setMeta('slug',slugify(e.target.value))}/></span></label>
        <label>Short summary<textarea rows={3} maxLength={300} value={meta.seo_description} onChange={e=>setMeta('seo_description',e.target.value)} placeholder="Shown under the title, on the blog list and in Google."/><small>{meta.seo_description.length}/300</small></label>
        <label>Author name<input maxLength={80} value={meta.author_name} onChange={e=>setMeta('author_name',e.target.value)} placeholder="Your profile name"/></label>
        <div className="writer-cover"><span>Cover image</span><div className="blog-covers">{blogCoverChoices.map(src=><button type="button" key={src} className={meta.cover_image===src?'selected':''} onClick={()=>setMeta('cover_image',src)} aria-label={'Use '+src}><img src={src} alt=""/></button>)}</div><input value={meta.cover_image} onChange={e=>setMeta('cover_image',e.target.value)} placeholder="or paste https://… / /media/…" aria-label="Cover image link"/>{meta.cover_image&&!blogCoverChoices.includes(meta.cover_image)&&<img className="writer-cover-preview" src={meta.cover_image} alt="Cover preview"/>}</div>
        <div className="writer-settings-actions">
          {meta.id&&meta.status==='published'&&<a className="text-link" href={'/blog/'+meta.slug} target="_blank" rel="noopener">View live post ↗</a>}
          {meta.status==='published'&&<button type="button" className="button outline" disabled={busy} onClick={()=>save('archived')}>Hide from blog</button>}
          {meta.id&&<button type="button" className="blog-delete" disabled={busy} onClick={destroy}>Delete post</button>}
        </div>
      </aside>}
    </div>
  </div>;
}
