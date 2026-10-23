import assert from 'node:assert/strict';import {adminResources,resourceHref} from './lib/admin-resources.mjs';import {existsSync,readFileSync} from 'node:fs';
assert.equal(new Set(adminResources.map(row=>row[0])).size,37);assert.equal(new Set(adminResources.map(row=>row[2])).size,37);
for(const [,title,section] of adminResources){const href=resourceHref(section);assert.ok(href.startsWith('/admin/'));assert.ok(title);if(!href.includes('/records/'))assert.ok(existsSync('app'+href+'/page.js'),href)}
for(const name of ['payments','audit_log','webhook_events','inventory_movements','order_events'])assert.equal(adminResources.find(row=>row[0]===name)[3],false);
const api=readFileSync('app/api/manage/route.js','utf8');assert.ok(api.includes('await staff(roles(section))'));assert.ok(api.includes('count:"exact"'));assert.ok(api.includes("section==='lookups'"));
console.log('PASS: 37 unique table/view screens, valid routes, reference lookups, pagination and read-only financial/audit records.');
