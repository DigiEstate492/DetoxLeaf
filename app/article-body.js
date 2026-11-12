import {bodyBlocks,parseInline} from '../lib/blog-blocks.mjs';

// Renders a blog post body. Shared by the public article page and the editor preview, so they always match.
export function Inline({text}){
  return parseInline(text).map((t,i)=>{
    if(t.type==='b')return <strong key={i}>{t.text}</strong>;
    if(t.type==='i')return <em key={i}>{t.text}</em>;
    if(t.type==='code')return <code key={i}>{t.text}</code>;
    if(t.type==='link'){const external=/^https?:\/\//.test(t.href);return <a key={i} href={t.href} {...(external?{target:'_blank',rel:'noopener noreferrer nofollow'}:{})}>{t.text}</a>;}
    return t.text.split('\n').flatMap((line,j)=>j?[<br key={i+'-'+j}/>,line]:[line]);
  });
}

export default function ArticleBody({body}){
  return <div className="article-body">{bodyBlocks(body).map((b,i)=>{
    switch(b.type){
      case 'h2':return <h2 key={i}><Inline text={b.text}/></h2>;
      case 'h3':return <h3 key={i}><Inline text={b.text}/></h3>;
      case 'quote':return <blockquote key={i}><Inline text={b.text}/></blockquote>;
      case 'ul':return <ul key={i}>{b.items.map((item,j)=><li key={j}><Inline text={item}/></li>)}</ul>;
      case 'ol':return <ol key={i}>{b.items.map((item,j)=><li key={j}><Inline text={item}/></li>)}</ol>;
      case 'divider':return <hr key={i}/>;
      case 'image':return <figure key={i}><img src={b.src} alt={b.alt||b.caption||''} loading="lazy"/>{b.caption&&<figcaption>{b.caption}</figcaption>}</figure>;
      default:return <p key={i}><Inline text={b.text}/></p>;
    }
  })}</div>;
}
