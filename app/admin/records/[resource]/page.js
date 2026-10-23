import {notFound} from "next/navigation";import AdminWorkspace from "../../../admin-workspace";import {adminResources} from "../../../../lib/admin-resources.mjs";
export const metadata={title:"Records | Detoxleaf Admin",robots:{index:false,follow:false}};
export default async function Page({params}){const {resource}=await params;if(!adminResources.some(r=>r[2]===resource))notFound();return <AdminWorkspace section={resource}/>;}
