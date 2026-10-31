"use client";
import Link from 'next/link';import LeafLoader from './leaf-loader';
const FEED_LIMIT=5;
const when=value=>new Date(value).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit',timeZone:'Asia/Kolkata'});
const levelNames={danger:'Urgent',warning:'Attention',info:'Reminder'};
function Alert({alert}){return <li className={'admin-alert '+alert.level}><div><strong><span className="sr-only">{levelNames[alert.level]}: </span>{alert.title}</strong><small>{alert.detail}</small></div>{alert.href&&<Link href={alert.href}>Open ↗</Link>}</li>}
function Stops({items}){return <ul className="admin-list">{items.map(item=><li key={item.id}><strong>{item.title}</strong><small>{item.detail}</small></li>)}</ul>}
function More({label,children}){return <details className="admin-more"><summary>{label}</summary>{children}</details>}
function Feed({items}){return <ul className="admin-list">{items.map(item=><li key={item.id}>{item.href?<Link href={item.href}><strong>{item.title}</strong></Link>:<strong>{item.title}</strong>}<small>{item.kind?item.kind+' · ':''}{item.detail||item.actor} · {when(item.at)}</small></li>)}</ul>}
export function ActivityView({alerts=[],deliveries={},additions=[],actions=[],unavailable=0}){
 const important=alerts.filter(a=>a.level!=='info'),reminders=alerts.filter(a=>a.level==='info');
 const today=deliveries.today||[],overdue=deliveries.overdue||[],tomorrow=deliveries.tomorrow||[],planDue=deliveries.planDue||[];
 return <section className="admin-activity" aria-label="Alerts and recent activity">
  <div className={'admin-attention'+(important.length?'':' clear')}><h2>{important.length?important.length+(important.length===1?' thing needs':' things need')+' your attention':'All clear'}</h2>{!important.length&&<p>Nothing urgent right now.</p>}{important.length>0&&<ul>{important.map(alert=><Alert alert={alert} key={alert.title}/>)}</ul>}{reminders.length>0&&<More label={reminders.length+(reminders.length===1?' reminder':' reminders')}><ul>{reminders.map(alert=><Alert alert={alert} key={alert.title}/>)}</ul></More>}{unavailable>0&&<p>Some checks could not load, so this list may be incomplete.</p>}</div>
  <div className="admin-activity-grid">
   <div className="admin-activity-card"><h2>Today’s deliveries <span>{today.length}</span></h2>{overdue.length>0&&<><h3>Overdue</h3><Stops items={overdue}/></>}{today.length?<Stops items={today}/>:<p className="admin-activity-empty">No deliveries today.</p>}{tomorrow.length+planDue.length>0&&<More label={'Coming up · '+(tomorrow.length+planDue.length)}>{tomorrow.length>0&&<><h3>Tomorrow</h3><Stops items={tomorrow}/></>}{planDue.length>0&&<><h3>Plan deliveries in the next 3 days</h3><Stops items={planDue}/></>}</More>}</div>
   <div className="admin-activity-card"><h2>New this week <span>{additions.length}</span></h2>{additions.length?<><Feed items={additions.slice(0,FEED_LIMIT)}/>{additions.length>FEED_LIMIT&&<More label={'Show '+(additions.length-FEED_LIMIT)+' more'}><Feed items={additions.slice(FEED_LIMIT)}/></More>}</>:<p className="admin-activity-empty">Nothing new this week.</p>}</div>
  </div>
 </section>;}
export function StaffActions({actions=[]}){if(!actions.length)return null;return <details className="admin-section-fold"><summary>Recent staff actions <span>{actions.length}</span></summary><Feed items={actions}/></details>}
export default function AdminActivity({state}){
 if(state.loading)return <LeafLoader label="Checking what needs your attention…"/>;
 if(state.error)return <p className="auth-error">{state.error}</p>;
 // Viewers run none of these checks, so "all clear" would be misleading.
 if(state.role==='viewer')return null;
 return <ActivityView {...state}/>;}
