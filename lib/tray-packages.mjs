export const trayPackages=[
 {id:'one-month',planCode:'WG-PKG-1-MONTH',name:'1 month plan',months:1,weeks:4,trays:12,pricePaise:500000,badge:'A fresh beginning',featured:false},
 {id:'two-months',planCode:'WG-PKG-2-MONTHS',name:'2 months plan',months:2,weeks:8,trays:24,pricePaise:720000,badge:'Build your routine',featured:false},
 {id:'three-months',planCode:'WG-PKG-3-MONTHS',name:'3 months plan',months:3,weeks:12,trays:36,pricePaise:850000,badge:'Maximum savings',featured:true}
];
export const packageRate=plan=>Math.round(plan.pricePaise/100/plan.trays);
export const isPackagePlan=plan=>trayPackages.some(p=>p.planCode===plan?.code);
export const isPackagePrice=paise=>trayPackages.some(p=>p.pricePaise===paise);
export const isPackageTrays=trays=>trayPackages.some(p=>p.trays===trays);
