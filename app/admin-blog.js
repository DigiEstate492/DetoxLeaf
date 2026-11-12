"use client";
import {useState} from 'react';
import LeafLoader from './leaf-loader';
import {api} from './commerce/client';
import {blogCoverChoices,paragraphsToText,slugify,textToParagraphs,validateBlogPost} from '../lib/blog-editor.mjs';

const statusLabels={draft:'Draft',published:'Published',archived:'Hidden'};
const when=value=>value?new Date(value).toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'}):'';
const emptyPost={title:'',slug:'',seo_description:'',cover_image:'',author_name:'',status:'draft',sections:[{title:'',text:''}]};
function toDraft(row){return {id:row.id,title:row.title||'',slug:row.slug||'',seo_description:row.seo_description||'',cover_image:row.cover_image||'',author_name:row.author_name||'',status:row.status||'draft',slugEdited:true,sections:(row.body?.sections?.length?row.body.sections:[{title:'',paragraphs:[]}]).map(s=>({title:s.title||'',text:paragraphsToText(s.paragraphs)}))};}

function Editor({initial,onClose,onSaved}){
  const [draft,setDraft]=useState(initial),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const set=(key,value)=>setDraft(d=>({...d,[key]:value,...(key==='title'&&!d.slugEdited?{slug:slugify(value)}:{})}));
  const setSection=(index,key,value)=>setDraft(d=>({...d,sections:d.sections.map((s,i)=>i===index?{...s,[key]:value}:s)}));
  const move=(index,step)=>setDraft(d=>{const sections=[...d.sections];const target=index+step;if(target<0||target>=sections.length)return d;[sections[index],sections[target]]=[sections[target],sections[index]];return {...d,sections};});
  const words=draft.sections.reduce((n,s)=>n+textToParagraphs(s.text).join(' ').split(/\s+/).filter(Boolean).length,0);
  async function save(status=draft.status){
    const post={...draft,status,sections:draft.sections.map(s=>({title:s.title,paragraphs:textToParagraphs(s.text)}))};
    const check=validateBlogPost(post);if(check.error){setMessage(check.error);return;}
    setBusy(true);setMessage('Saving…');
    try{const {record}=await api('/api/manage',{method:'POST',body:JSON.stringify({action:'blog_save',id:draft.id,post})});setDraft(toDraft(record));setMessage(status==='published'?'Published. It is live on the blog now.':status==='archived'?'Hidden from the blog.':'Draft saved. Only the team can see it.');onSaved();}
    catch(error){setMessage(error.message);}finally{setBusy(false);}
  }
  async function remove(){
    if(!draft.id||!window.confirm('Delete "'+(draft.title||'this post')+'" permanently? This cannot be undone. Choose "Hide" instead to take it off the blog but keep it.'))return;
    setBusy(true);try{await api('/api/manage',{method:'POST',body:JSON.stringify({action:'blog_delete',id:draft.id})});onSaved();onClose();}catch(error){setMessage(error.message);setBusy(false);}
  }
  return <form className="surface-panel screen-form blog-editor" onSubmit={e=>{e.preventDefault();save();}}>
    <div className="admin-section-title"><h2>{draft.id?'Edit post':'New post'}</h2><button type="button" onClick={onClose}>Close ×</button></div>
    <label>Title<input required maxLength={140} value={draft.title} onChange={e=>set('title',e.target.value)} placeholder="e.g. Five ways to enjoy wheatgrass in the morning"/></label>
    <label>Web address<span className="blog-slug"><span>detoxleaf.in/blog/</span><input required maxLength={80} value={draft.slug} onChange={e=>setDraft(d=>({...d,slug:e.target.value,slugEdited:true}))} onBlur={e=>setDraft(d=>({...d,slug:slugify(e.target.value)}))}/></span></label>
    <label>Short summary<textarea rows={2} maxLength={300} value={draft.seo_description} onChange={e=>set('seo_description',e.target.value)} placeholder="One or two sentences shown on the blog list and in Google results."/><small>{draft.seo_description.length}/300</small></label>
    <div className="blog-row">
      <label>Author name<input maxLength={80} value={draft.author_name} onChange={e=>set('author_name',e.target.value)} placeholder="Leave empty to use your profile name"/></label>
      <label>Cover image<input value={draft.cover_image} onChange={e=>set('cover_image',e.target.value)} placeholder="/media/photo.png or https://…"/></label>
    </div>
    <div className="blog-covers" role="group" aria-label="Quick cover choices">{blogCoverChoices.map(src=><button type="button" key={src} className={draft.cover_image===src?'selected':''} onClick={()=>set('cover_image',src)} aria-label={'Use '+src}><img src={src} alt=""/></button>)}{draft.cover_image&&!blogCoverChoices.includes(draft.cover_image)&&<img className="blog-cover-preview" src={draft.cover_image} alt="Cover preview"/>}</div>
    <fieldset className="blog-sections"><legend>Article · {words} words · about {Math.max(1,Math.round(words/200))} min read</legend>
      {draft.sections.map((section,index)=><div className="blog-section" key={index}>
        <div className="blog-section-head"><strong>Section {index+1}</strong><span><button type="button" onClick={()=>move(index,-1)} disabled={index===0} aria-label="Move section up">↑</button><button type="button" onClick={()=>move(index,1)} disabled={index===draft.sections.length-1} aria-label="Move section down">↓</button><button type="button" onClick={()=>setDraft(d=>({...d,sections:d.sections.filter((_,i)=>i!==index)}))} disabled={draft.sections.length===1} aria-label="Remove section">Remove</button></span></div>
        <label>Heading<input maxLength={140} value={section.title} onChange={e=>setSection(index,'title',e.target.value)} placeholder="Section heading"/></label>
        <label>Text<textarea rows={7} value={section.text} onChange={e=>setSection(index,'text',e.target.value)} placeholder="Write here. Leave an empty line between paragraphs."/></label>
      </div>)}
      {draft.sections.length<30&&<button type="button" className="button outline" onClick={()=>setDraft(d=>({...d,sections:[...d.sections,{title:'',text:''}]}))}>+ Add section</button>}
    </fieldset>
    <p role="status" className="blog-message">{message}</p>
    <div className="blog-actions">
      <button type="button" className="button green" disabled={busy} onClick={()=>save('published')}>{draft.status==='published'?'Update live post ↗':'Publish ↗'}</button>
      <button type="button" className="button outline" disabled={busy} onClick={()=>save(draft.status==='published'?'published':'draft')}>{draft.status==='published'?'Save':'Save draft'}</button>
      {draft.status==='published'&&<button type="button" className="button outline" disabled={busy} onClick={()=>save('archived')}>Hide from blog</button>}
      {draft.id&&draft.status==='published'&&<a className="text-link" href={'/blog/'+draft.slug} target="_blank" rel="noopener">View on site ↗</a>}
      {draft.id&&<button type="button" className="blog-delete" disabled={busy} onClick={remove}>Delete</button>}
    </div>
  </form>;
}

export default function AdminBlog({state,refresh}){
  const [editing,setEditing]=useState(null),[filter,setFilter]=useState('all'),[query,setQuery]=useState('');
  if(state.loading&&!state.rows)return <LeafLoader label="Loading blog posts…"/>;
  if(state.error)return <div className="auth-error"><h2>Unable to load blog posts.</h2><p>{state.error}</p></div>;
  if(editing)return <Editor key={editing.id||'new'} initial={editing} onClose={()=>setEditing(null)} onSaved={refresh}/>;
  const rows=(state.rows||[]).filter(r=>(filter==='all'||r.status===filter)&&(r.title+' '+r.slug+' '+(r.author_name||'')).toLowerCase().includes(query.toLowerCase()));
  const count=status=>(state.rows||[]).filter(r=>r.status===status).length;
  return <section className="admin-blog">
    <div className="admin-blog-bar">
      <button className="button green" onClick={()=>setEditing({...emptyPost,sections:[{title:'',text:''}]})}>+ New post</button>
      <input type="search" aria-label="Search posts" placeholder="Search posts…" value={query} onChange={e=>setQuery(e.target.value)}/>
      <div className="admin-blog-filters" role="group" aria-label="Filter by status">{[['all','All',(state.rows||[]).length],['published','Published',count('published')],['draft','Drafts',count('draft')],['archived','Hidden',count('archived')]].map(([key,label,n])=><button key={key} aria-pressed={filter===key} onClick={()=>setFilter(key)}>{label} <span>{n}</span></button>)}</div>
    </div>
    {rows.length?<ul className="admin-blog-list">{rows.map(row=><li key={row.id}><button onClick={()=>setEditing(toDraft(row))}>
      <span className={'blog-status blog-status-'+row.status}>{statusLabels[row.status]||row.status}</span>
      <strong>{row.title}</strong>
      <small>/blog/{row.slug} · {row.author_name?'By '+row.author_name+' · ':''}Edited {when(row.updated_at||row.created_at)}</small>
    </button></li>)}</ul>:<div className="surface-panel admin-blog-empty"><h2>{state.rows?.length?'No posts match.':'No posts yet.'}</h2><p>{state.rows?.length?'Try another search or filter.':'Write the first one with "New post". Drafts stay private until you publish.'}</p></div>}
    <p className="preview-note">Starter articles that came with the site are built in and do not appear here. To change one, create a post with the same web address and publish it; yours replaces the built-in version.</p>
  </section>;
}
