"use client";
import {useState} from 'react';
import LeafLoader from './leaf-loader';
import BlogWriter from './blog-writer';

const statusLabels={draft:'Draft',published:'Published',archived:'Hidden'};
const when=value=>value?new Date(value).toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'}):'';
export default function AdminBlog({state,refresh}){
  const [editing,setEditing]=useState(null),[filter,setFilter]=useState('all'),[query,setQuery]=useState('');
  if(state.loading&&!state.rows)return <LeafLoader label="Loading blog posts…"/>;
  if(state.error)return <div className="auth-error"><h2>Unable to load blog posts.</h2><p>{state.error}</p></div>;
  if(editing)return <BlogWriter key={editing.row?.id||'new'} row={editing.row} onClose={()=>setEditing(null)} onSaved={refresh}/>;
  const rows=(state.rows||[]).filter(r=>(filter==='all'||r.status===filter)&&(r.title+' '+r.slug+' '+(r.author_name||'')).toLowerCase().includes(query.toLowerCase()));
  const count=status=>(state.rows||[]).filter(r=>r.status===status).length;
  return <section className="admin-blog">
    <div className="admin-blog-bar">
      <button className="button green" onClick={()=>setEditing({row:null})}>+ New post</button>
      <input type="search" aria-label="Search posts" placeholder="Search posts…" value={query} onChange={e=>setQuery(e.target.value)}/>
      <div className="admin-blog-filters" role="group" aria-label="Filter by status">{[['all','All',(state.rows||[]).length],['published','Published',count('published')],['draft','Drafts',count('draft')],['archived','Hidden',count('archived')]].map(([key,label,n])=><button key={key} aria-pressed={filter===key} onClick={()=>setFilter(key)}>{label} <span>{n}</span></button>)}</div>
    </div>
    {rows.length?<ul className="admin-blog-list">{rows.map(row=><li key={row.id}><button onClick={()=>setEditing({row})}>
      <span className={'blog-status blog-status-'+row.status}>{statusLabels[row.status]||row.status}</span>
      <strong>{row.title}</strong>
      <small>/blog/{row.slug} · {row.author_name?'By '+row.author_name+' · ':''}Edited {when(row.updated_at||row.created_at)}</small>
    </button></li>)}</ul>:<div className="surface-panel admin-blog-empty"><h2>{state.rows?.length?'No posts match.':'No posts yet.'}</h2><p>{state.rows?.length?'Try another search or filter.':'Write the first one with "New post". Drafts stay private until you publish.'}</p></div>}
    <p className="preview-note">Starter articles that came with the site are built in and do not appear here. To change one, create a post with the same web address and publish it; yours replaces the built-in version.</p>
  </section>;
}
