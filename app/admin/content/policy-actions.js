"use server";
import {revalidatePath} from 'next/cache';
import {requireStaff} from '../../../lib/supabase/auth';
import {storePolicies,policyRecord} from '../../../lib/store-policies.mjs';
export async function publishStorePolicies(){
 const {supabase,staff}=await requireStaff();if(!['owner','admin'].includes(staff.role))return {error:'An owner or admin must publish policies.'};
 let count=0;
 for(const slug of Object.keys(storePolicies)){
  const lookup=await supabase.from('content_pages').select('id').eq('slug',slug).maybeSingle();
  if(lookup.error)return {error:`${count} of 4 policies saved. Could not read the remaining policy. Check database configuration and retry.`};
  const result=await supabase.rpc('dl_admin_write',{entity:'content_pages',record_id:lookup.data?.id||null,fields:policyRecord(slug)});
  if(result.error)return {error:`${count} of 4 policies saved. Could not publish the remaining policy. Check the commerce migration and retry.`};
  count++;
 }
 for(const path of ['/privacy-policy','/refund-policy','/shipping-policy','/terms-and-conditions','/admin/content','/checkout'])revalidatePath(path);
 return {success:'All four updated policies are published. You can edit their wording in the content editor below.'};
}
