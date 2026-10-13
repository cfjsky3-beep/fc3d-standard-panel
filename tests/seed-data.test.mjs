import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
function load(path, dependencies={}){const source=fs.readFileSync(new URL(path,import.meta.url),"utf8");const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;const exports={};vm.runInNewContext(js,{exports,require:name=>dependencies[name]??{}});return exports;}
const source=JSON.parse(fs.readFileSync(new URL("../app/data/fc3d-source.json",import.meta.url),"utf8"));
const fc3d=load("../app/fc3d-data.ts",{"./data/fc3d-source.json":{default:source}});
const ssc=load("../app/ssc-data.ts");
const standard=load("../app/standard-odds.ts");
const seed=load("../app/seed-table.tsx",{"./ssc-data":ssc,"./fc3d-data":fc3d,"./standard-odds":standard});
const noop=()=>{};
const page=load("../app/page.tsx",{"react":{useEffect:noop,useMemo:fn=>fn(),useRef:()=>({current:null}),useState:value=>[value,noop]},"react/jsx-runtime":{jsx:noop,jsxs:noop,Fragment:"fragment"},"./ssc-data":ssc,"./fc3d-data":fc3d,"./standard-odds":standard,"./seed-table":seed,"./rules-catalog":{RulesCatalog:noop}});
const hierarchy=(group,name)=>{if(group==="三星"){const level2=name.startsWith("三星直选")?"三星直选":name.startsWith("三星通选")?"三星通选":"三星组选";return {level1:"三星",level2,level3:name.slice(level2.length)||name};}if(group==="前二"||group==="后二"){const level2=`${group}${name.includes("直选")?"直选":"组选"}`;return {level1:"二星",level2,level3:name.slice(level2.length)||name};}if(group==="定位胆")return {level1:"定位胆",level2:"定位胆",level3:"定位胆"};if(group==="不定胆")return {level1:"不定胆",level2:"三星不定胆",level3:name.slice(2)};return {level1:"龙虎",level2:"龙虎和",level3:"龙虎和"};};
const rows=fc3d.fc3dGroups.flatMap(group=>group.items.map(name=>({game:"fc3d",group:group.title,name,...hierarchy(group.title,name),...fc3d.fc3dHelp(name)})));

test("福彩3D保留31个三级玩法且规则完整",()=>{assert.equal(rows.length,31);assert.equal(new Set(rows.map(r=>r.name)).size,31);assert.equal(new Set(rows.map(r=>r.level1)).size,5);assert.equal(new Set(rows.map(r=>r.level2)).size,10);assert.ok(rows.every(r=>r.text&&r.bet&&r.sample));assert.ok(rows.every(r=>!`${r.text}${r.bet}${r.sample}`.includes("万位")));});
test("竞品商业赔率仅作对照且龙虎奖项映射正确",()=>{assert.deepEqual(Object.fromEntries(Object.entries(fc3d.fc3dObservedOdds["龙虎和"])),{"和":"9.8","龙、虎":"2.1777"});});
test("理论标准赔率含本金无抽水",()=>{const value=(name,award)=>standard.standardOdds("fc3d",name).find(x=>x.award===award)?.value;assert.equal(value("三星直选复式","指定有序三位号码"),"1000.000000");assert.equal(value("三星组选三复式","每组一重号＋一单号"),"333.333333");assert.equal(value("三星组选六复式","每组三个不同号码"),"166.666667");assert.equal(value("三星一码不定胆","每个指定号码"),"3.690037");assert.equal(value("三星二码不定胆","每组两个不同号码"),"18.518519");assert.equal(value("龙虎和","龙"),"2.222222");assert.equal(value("龙虎和","和"),"10.000000");});
test("和值跨度和包胆保留展开注数",()=>{assert.equal(standard.standardOdds("fc3d","三星直选和值").find(x=>x.award==="13").betCount,75);assert.equal(standard.standardOdds("fc3d","三星直选跨度").find(x=>x.award==="0").betCount,10);assert.equal(standard.standardOdds("fc3d","前二组选包胆")[0].betCount,9);const bold=standard.standardOdds("fc3d","三星组选包胆").filter(x=>x.award.startsWith("0·"));assert.deepEqual(Array.from(bold,x=>x.betCount),[18,36]);});
test("初始化数据保存三级字段、六位赔率与生产关闭",()=>{const records=seed.exportRecords(rows,"fc3d");assert.equal(records.length,31);assert.ok(records.every(r=>r.code.startsWith("FC3D_")&&r.defaultOddsSource==="theoretical-fair-gross"&&r.productionEnabled===false));assert.ok(records.every(r=>r.scheme&&r.play));assert.equal(records.find(r=>r.name==="龙虎和").standardOdds.length,3);});
test("注数与同期开奖最高中奖分别计算",()=>{assert.equal(page.betCountForSelections("三星直选和值",["和值-13"]),75);assert.equal(page.betCountForSelections("三星组选包胆",["三星组选包胆-3"]),54);const picks=["百十-和","百个-和","十个-和"];assert.equal(page.betCountForSelections("龙虎和",picks),3);assert.equal(page.maximumPayoutMultiplier("fc3d","standard","龙虎和",picks,"2.22～10.00"),30);assert.equal(page.maximumPayoutMultiplier("fc3d","standard","三星一码不定胆",["号码-1","号码-2","号码-3"],"3.69"),3*(1000/271));});
