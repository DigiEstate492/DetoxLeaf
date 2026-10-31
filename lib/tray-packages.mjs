export const trayPackages=[
 {id:'one-month',name:'1 month plan',months:1,weeks:4,trays:12,pricePaise:500000,badge:'A fresh beginning',featured:false},
 {id:'two-months',name:'2 months plan',months:2,weeks:8,trays:24,pricePaise:720000,badge:'Build your routine',featured:false},
 {id:'three-months',name:'3 months plan',months:3,weeks:12,trays:36,pricePaise:850000,badge:'Maximum savings',featured:true}
];
export const packageRate=plan=>Math.round(plan.pricePaise/100/plan.trays);
export function packageBookingUrl(plan){if(!trayPackages.some(p=>p.id===plan.id))throw new Error('Unknown tray package');const text=`Hi Detoxleaf! I'd like to book the ${plan.name}: ${plan.trays} wheatgrass trays for ₹${plan.pricePaise/100}, supplied as 3 trays per week over ${plan.weeks} weeks. Please confirm delivery coverage for my PIN, the delivery schedule, applicable delivery charges and tax, payment arrangements, and cancellation terms before I pay.`;return 'https://api.whatsapp.com/send/?'+new URLSearchParams({phone:'918796159077',text,type:'phone_number',app_absent:'0'}).toString();}
