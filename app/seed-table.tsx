/* eslint jsx-a11y/no-noninteractive-tabindex: ["error", {"roles": ["region"]}] -- Named scroll regions must be keyboard-focusable for horizontal table navigation. */
import { useState } from "react";
import { observedOdds, videoFile } from "./ssc-data";
import { fc3dObservedOdds, fc3dVideoFile } from "./fc3d-data";
import { standardOdds, displayStandard } from "./standard-odds";

type Seed = {game:string;group:string;name:string;text:string;bet:string;sample:string};
export const playHeaders = ["类型","方案","玩法","玩法缩写","玩法简介","玩法说明","投注示例","示例号码"];
export function playFields(r:Seed) {
  const match = r.name.match(/^(三星|前二|后二)(直选|组选)?(.+)$/);
  const scheme = match ? match[1] + (match[2] ?? "") : r.name;
  const play = match ? match[3] : r.name;
  // The Chinese short name is a display label, not the internal identifier.
  const introduction = r.text.includes("尚待提供") ? "待补充" : r.text.split(/[；;。]/)[0];
  return {type:r.group,scheme,play,shortName:r.name,introduction};
}
// Name-based keys are independent of display order. Changing a name requires an explicit migration.
export function seedCode(game:string,name:string) { return `${game.toUpperCase()}_${Array.from(name).map(c=>c.codePointAt(0)!.toString(16)).join("_")}`; }
export function exportRecords(rows:Seed[],game:string) {
  return rows.map((r,index)=>{
    const evidence = r.game === "ssc" ? observedOdds[r.name] ?? {} : r.game === "fc3d" ? Object.fromEntries(Object.entries(fc3dObservedOdds[r.name] ?? {}).map(([option,raw])=>[option,{raw,settlementOdds:raw,status:"竞品在线配置已确认",seconds:null}])) : {};
    const standards = r.game === "fc3d" ? Object.entries(fc3dObservedOdds[r.name] ?? {}).map(([award,value])=>({award,total:null,wins:null,exact:null,value,formula:"基础奖金 × 0.98",note:"开云彩票当前账号福彩3D标准盘在线配置，2026-10-06采集"})) : standardOdds(r.game,r.name);
    const uniform = new Set(standards.map(o=>o.value));
    return {code:seedCode(r.game,r.name),game:r.game,panel:"standard",parent:r.group,name:r.name,recommendedOrder:index+1,...playFields(r),
      description:r.text,betExample:r.bet,resultExample:r.sample,ruleStatus:r.game==="fc3d"?"竞品在线配置已核对":"参考稿，边界待验收",source:r.game==="ssc" ? (r.name==="龙虎和" ? "用户提供DB截图" : "老系统录像整理") : r.game==="fc3d" ? "开云彩票福彩3D在线配置；老竞品说明格式" : "既有原型待核对",
      defaultOdds:uniform.size===1 ? standards[0].value : null,standardOdds:standards,defaultOddsSource:r.game==="fc3d"?"competitor-live-config-2026-10-06":"theoretical-fair-gross",odds:Object.entries(evidence).map(([option,v])=>({option,rawOdds:v.raw,settlementOdds:v.settlementOdds,status:v.status,sourceFile:r.game==="fc3d"?fc3dVideoFile:videoFile,sourceSeconds:v.seconds})),
      oddsStatus:Object.keys(evidence).length ? (r.game==="fc3d"?"已完整录入在线配置":"已录入可见项；其余为空") : "未确认",productionEnabled:false};
  }).filter(r=>game==="all"||r.game===game);
}
export function csvCell(value:unknown) {
  let str = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(str)) str = "'"+str;
  return '"'+str.replaceAll('"','""')+'"';
}
export function seedCsv(records:ReturnType<typeof exportRecords>) {
  const lines:unknown[][] = [["code","game","panel","parent","name","recommendedOrder","description","betExample","resultExample","source","option","rawOdds","settlementOdds","oddsStatus","sourceFile","sourceSeconds","productionEnabled"]];
  for (const r of records) for(const v of r.odds.length ? r.odds : [null]) lines.push([r.code,r.game,r.panel,r.parent,r.name,r.recommendedOrder,r.description,r.betExample,r.resultExample,r.source,v?.option,v?.rawOdds,v?.settlementOdds,v?.status??r.oddsStatus,v?.sourceFile,v?.sourceSeconds,false]);
  return "\uFEFF"+lines.map(row=>row.map(csvCell).join(",")).join("\r\n");
}
export function playCsv(records:ReturnType<typeof exportRecords>) {
  return "\uFEFF"+[playHeaders,...records.map(r=>[r.type,r.scheme,r.play,r.shortName,r.introduction,r.description,r.betExample,r.resultExample])].map(row=>row.map(csvCell).join(",")).join("\r\n");
}
export function standardCsv(records:ReturnType<typeof exportRecords>) {
  const lines:unknown[][]=[["彩种","玩法","奖项","投注注数","最高赔率","精确分数","总组合数","中奖组合数","公式","计算假设"]];
  for(const r of records) for(const o of r.standardOdds) lines.push([r.game==="ssc"?"时时彩":r.game==="fc3d"?"福彩3D":"快三",`${r.type}-${r.scheme}-${r.play}`,o.award,o.betCount??1,o.value,o.exact,o.total,o.wins,o.formula,o.note]);
  return "\uFEFF"+lines.map(row=>row.map(csvCell).join(",")).join("\r\n");
}
export function SeedTable({rows,game}:{rows:Seed[];game:string}) {
  const [message,setMessage] = useState("");
  const records = exportRecords(rows,game);
  function download(format:"json"|"csv"|"plays"|"standard") {
    try {
      const content=format==="json" ? JSON.stringify({schemaVersion:"1.2.0",dataVersion:"2026-10-06",notes:["福彩3D标准盘共31个当前启用玩法","玩法说明、投注示例和示例号码采用老竞品格式编写","赔率来自开云彩票2026-10-06在线标准盘配置，为基础奖金×当前返奖率0.98","按code幂等更新；生产默认禁用，待业务验收后启用"],plays:records},null,2) : seedCsv(records);
      const url=URL.createObjectURL(new Blob([format==="plays" ? playCsv(records) : format==="standard" ? standardCsv(records) : content],{type:format==="json"?"application/json;charset=utf-8":"text/csv;charset=utf-8"}));
      const link=document.createElement("a");link.href=url;link.download=`lottery-${format==="plays"?"plays":format==="standard"?"standard-odds":"seed"}-${game}-20261006.${format==="json"?"json":"csv"}`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
      setMessage(`已生成 ${records.length} 个玩法的 ${format.toUpperCase()} 文件`);
    } catch {setMessage("导出失败，请重试或联系研发读取种子数据源。");}
  }
  return <section className="admin-card seed-card"><h2>玩法与赔率初始化数据</h2>
    <div className="seed-export"><button onClick={()=>download("json")}>导出 JSON（研发）</button><button onClick={()=>download("plays")}>导出 CSV（玩法字段）</button><button onClick={()=>download("csv")}>导出 CSV（逐项赔率）</button><span>{records.length} 个玩法 · {records.reduce((n,r)=>n+r.odds.length,0)} 条可见赔率</span></div>
    <p role="status" className="admin-note seed-feedback">{message}</p>
    <p className="admin-note">福彩3D的31个玩法与赔率来自开云彩票2026-10-06在线标准盘配置；玩法说明、投注示例和示例号码采用老竞品格式编写。赔率保留4位小数，并按玩法编码幂等初始化。</p>
    {["ssc","k3","fc3d"].filter(g=>records.some(r=>r.game===g)).map(g=><div key={g}>
    <h2>{g==="ssc"?"时时彩":g==="fc3d"?"福彩3D":"快三"} · 玩法初始化数据</h2>
    <div className="table-scroll seed-table-scroll" role="region" aria-label="玩法初始化数据，可横向滚动查看全部列" tabIndex={0}><table className="seed-table">
      <colgroup>{[120,140,140,180,240,340,200,240].map((width,i)=><col key={i} style={{width}}/>)}</colgroup>
      <thead><tr>{playHeaders.map(h=><th scope="col" key={h}>{h}</th>)}</tr></thead>
      <tbody>{records.filter(r=>r.game===g).map(r=><tr key={r.code}>
        <td>{r.type}</td><td>{r.scheme}</td><td>{r.play}</td>
        <td><strong className="seed-play-name">{r.shortName}</strong></td>
        <td>{r.introduction}</td><td><div className="seed-description">{r.description}</div></td>
        <td>{r.betExample || "待补充"}</td><td>{r.resultExample || "待补充"}</td>
      </tr>)}</tbody>
    </table></div></div>)}
    <h2>2、玩法赔率 · 竞品当前标准赔率</h2>
    <p className="admin-note">赔率按竞品接口的基础奖金 × 当前返奖率0.98录入；多奖级玩法逐奖项保存。客户端可截断展示，但初始化和后台编辑保留采集精度。</p>
    <div className="seed-export"><button onClick={()=>download("standard")}>导出 CSV（标准赔率与公式）</button></div>
    {["ssc","k3","fc3d"].filter(g=>records.some(r=>r.game===g)).map(g=><div key={g}><h2>总后台：{g==="ssc"?"时时彩":g==="fc3d"?"福彩3D":"快三"}标准盘玩法赔率</h2>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="理论标准赔率表"><table className="standard-odds-table"><colgroup><col style={{width:"43%"}}/><col style={{width:"20%"}}/><col style={{width:"17%"}}/><col style={{width:"20%"}}/></colgroup><thead><tr><th scope="col">玩法</th><th scope="col">奖项</th><th scope="col">投注注数</th><th scope="col">最高赔率</th></tr></thead><tbody>
      {records.filter(r=>r.game===g).flatMap(r=>r.standardOdds.map((o,i)=><tr key={`${r.code}-${i}`}><td>{r.type}-{r.scheme}-{r.play}</td><td>{o.award}</td><td>{o.betCount??1}</td><td><b>{displayStandard(o.value)}</b><details><summary>计算说明</summary><small>{o.formula && `${o.formula} = ${o.value}；`}{o.note}</small></details></td></tr>))}
      </tbody></table></div></div>)}
  </section>;
}
