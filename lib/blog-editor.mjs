// Blog post validation shared by the admin editor and the server. The database stores a post body as
// {sections:[{title, paragraphs:[...]}]}, the same shape the public blog pages already read.

export const blogRoles=['owner','admin','manager'];
export const blogStatuses=['draft','published','archived'];
export const blogCoverChoices=['/media/wheatgrass-hero.png','/media/wheatgrass-tray.png'];

export function slugify(value){
  return String(value||'').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g,'')
    .replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80).replace(/-+$/,'');
}

// Text box → paragraphs: a blank line starts a new paragraph.
export const textToParagraphs=text=>String(text||'').replace(/\r\n?/g,'\n').split(/\n\s*\n/).map(p=>p.replace(/\s*\n\s*/g,' ').trim()).filter(Boolean);
export const paragraphsToText=paragraphs=>(Array.isArray(paragraphs)?paragraphs.filter(p=>typeof p==='string'):[]).join('\n\n');

const text=(value,max)=>String(value??'').replace(/\s+/g,' ').trim().slice(0,max);

// Returns {post} ready to save, or {error} with a message for the editor.
export function validateBlogPost(input={}){
  const title=text(input.title,140);
  if(title.length<3)return {error:'Give the post a title of at least 3 characters.'};
  const slug=slugify(input.slug||title);
  if(!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug))return {error:'The web address can use only letters, numbers and dashes.'};
  const status=blogStatuses.includes(input.status)?input.status:'draft';
  const cover=String(input.cover_image||'').trim();
  if(cover&&!/^(\/[A-Za-z0-9._/-]+|https:\/\/[^\s"<>]+)$/.test(cover))return {error:'The cover image must be a site image such as /media/photo.png or an https:// link.'};
  const rawSections=Array.isArray(input.sections)?input.sections.slice(0,30):[];
  const sections=rawSections.map(s=>({title:text(s?.title,140),paragraphs:(Array.isArray(s?.paragraphs)?s.paragraphs:textToParagraphs(s?.text)).map(p=>String(p).trim().slice(0,4000)).filter(Boolean).slice(0,30)}))
    .filter(s=>s.title||s.paragraphs.length);
  if(status==='published'&&!sections.some(s=>s.paragraphs.length))return {error:'Add some text to at least one section before publishing.'};
  return {post:{
    kind:'blog',title,slug,status,
    seo_title:text(input.seo_title,140)||null,
    seo_description:text(input.seo_description,300)||null,
    cover_image:cover||null,
    author_name:text(input.author_name,80)||null,
    body:{sections},
  }};
}

export const readMinutes=sections=>Math.max(1,Math.round((sections||[]).flatMap(s=>s.paragraphs||[]).join(' ').split(/\s+/).filter(Boolean).length/200));
