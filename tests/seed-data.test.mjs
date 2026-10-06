import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(path, dependencies = {}) {
  const source = fs.readFileSync(new URL(path, import.meta.url), "utf8");
  const js = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports = {};
  vm.runInNewContext(js, {exports, require:name=>dependencies[name] ?? {}});
  return exports;
}

const source = JSON.parse(fs.readFileSync(new URL("../app/data/fc3d-source.json", import.meta.url), "utf8"));
const fc3d = load("../app/fc3d-data.ts", {"./data/fc3d-source.json":{default:source}});
const ssc = load("../app/ssc-data.ts");
const standard = load("../app/standard-odds.ts");
const seed = load("../app/seed-table.tsx", {"./ssc-data":ssc,"./fc3d-data":fc3d,"./standard-odds":standard});

const rows = fc3d.fc3dGroups.flatMap(group => group.items.map(name => ({game:"fc3d",group:group.title,name,...fc3d.fc3dHelp(name)})));

test("福彩3D目录与开云当前标准盘一致", () => {
  assert.equal(rows.length,31);
  assert.equal(new Set(rows.map(row=>row.name)).size,31);
  assert.deepEqual(Array.from(fc3d.fc3dGroups,group=>group.title),["三星","前二","后二","定位胆","不定胆","龙虎"]);
  assert.ok(rows.every(row=>row.text && row.bet && row.sample));
  assert.ok(rows.every(row=>Object.keys(fc3d.fc3dObservedOdds[row.name] ?? {}).length > 0));
  assert.ok(rows.every(row=>!`${row.text}${row.bet}${row.sample}`.includes("万位") && !`${row.text}${row.bet}${row.sample}`.includes("千位")));
  assert.equal(rows.find(row=>row.name==="定位胆").bet,"3,-,-");
});

test("福彩3D赔率按基础奖金乘0.98展示", () => {
  assert.equal(fc3d.fc3dObservedOdds["三星直选复式"]["一等奖"],"980");
  assert.equal(fc3d.fc3dObservedOdds["前二直选复式"]["一等奖"],"98");
  assert.equal(fc3d.fc3dObservedOdds["定位胆"]["一等奖"],"9.8");
  assert.equal(fc3d.fc3dObservedOdds["三星二码不定胆"]["一等奖"],"18.1447");
  assert.deepEqual(Object.fromEntries(Object.entries(fc3d.fc3dObservedOdds["龙虎和"])),{"龙、虎":"9.8","和":"2.1777"});
});

test("初始化数据使用独立福彩3D编码与完整规则", () => {
  const records = seed.exportRecords(rows,"fc3d");
  assert.equal(records.length,31);
  assert.ok(records.every(record=>record.code.startsWith("FC3D_")));
  assert.ok(records.every(record=>record.defaultOddsSource==="competitor-live-config-2026-10-06"));
  assert.ok(records.every(record=>record.odds.length>0 && record.productionEnabled===false));
  assert.equal(new Set(records.map(record=>record.code)).size,31);
});
