export const staffRoles=["owner","admin","operations","support","viewer"];
export function safeNext(value,fallback="/account"){
 if(typeof value!=="string"||!value.startsWith("/")||value.startsWith("//")||/[\\\s]/.test(value))return fallback;
 try{const url=new URL(value,"https://detoxleaf.invalid");if(url.origin!=="https://detoxleaf.invalid")return fallback;return url.pathname+url.search;}catch{return fallback;}
}
export function allowedStaff(record){return Boolean(record?.active&&staffRoles.includes(record.role));}
export function staffCanOpen(role,path){
 if(["owner","admin"].includes(role))return true;
 const section=path.split("/")[2]||"overview";
 const allowed={operations:["overview","orders","inventory","batches","deliveries","stock-health"],support:["overview","orders","customers","support","reviews"],viewer:["overview","analytics","reports"]};
 return allowed[role]?.includes(section)||false;
}
