import { useState } from "react";
import { exportRecords } from "./seed-table";
import { displayStandard } from "./standard-odds";

type RuleRow = Parameters<typeof exportRecords>[0][number];

export function RulesCatalog({ rows }: { rows: RuleRow[] }) {
  const [game, setGame] = useState("all");
  const [query, setQuery] = useState("");
  const records = exportRecords(rows, game);
  const visible = records.filter(r => `${r.name} ${r.parent}`.includes(query.trim()));
  const groups = [...new Set(visible.map(r => `${r.game}:${r.parent}`))];
  const incomplete = records.filter(r => !r.betExample || !r.resultExample);
  return <div className="rules-catalog">
    <section className="spec-card">
      <h2>全部标准盘玩法规则</h2>
      <div className="rules-toolbar">
        <div className="seed-filter" aria-label="筛选规则彩种">{[["all","全部"],["fc3d","福彩3D"]].map(([value,label]) => <button key={value} aria-pressed={game===value} className={game===value ? "active" : ""} onClick={()=>setGame(value)}>{label}</button>)}</div>
        <label>查找玩法<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="输入玩法或父级名称" /></label>
        <span role="status">显示 {visible.length} / {records.length} 个子玩法</span>
      </div>
      <p>逐个列出福彩3D的选号要求、中奖条件、投注示例与开奖号码示例。说明沿用老竞品格式，31个玩法及标准赔率按开云彩票当前配置整理。</p>
    </section>
    {incomplete.length>0 && <section className="spec-card rules-pending"><h2>仍需补充原始规则 · {incomplete.length} 项</h2><p>{incomplete.map(r=>r.name).join("、")}。以上玩法保留目录，说明或示例尚不完整，需补充原始材料后确认，不能直接作为结算依据。</p></section>}
    {!visible.length && <section className="spec-card"><p>未找到对应玩法，请更换关键词或切换到“全部”。</p></section>}
    {groups.map(key=>{
      const items=visible.filter(r=>`${r.game}:${r.parent}`===key);
      return <section className="spec-card rules-group" key={key}>
        <h2>福彩3D · {items[0].parent}<small>{items.length} 个玩法</small></h2>
        {items.map(r=>{
          const confirmedOdds = r.standardOdds.filter(o=>o.value!==null);
          const hasMultipleOdds = new Set(confirmedOdds.map(o=>o.value)).size > 1;
          return <article className="rule-entry" key={r.code}>
          <header><h3>{r.name}</h3>{r.name==="龙虎和" && <span className="rule-source-badge">开云配置</span>}</header>
          <p className="rule-description">{r.description}</p>
          <dl><div><dt>投注示例</dt><dd>{r.betExample || "待提供投注示例"}</dd></div><div><dt>示例号码</dt><dd>{r.resultExample || "待提供示例号码"}</dd></div></dl>
          {hasMultipleOdds && <details className="rule-odds"><summary>查看全部标准赔率</summary><div>{confirmedOdds.map(o=><span key={o.award}><b>{o.award.replace("·"," · ")}：{displayStandard(o.value)}</b>{o.betCount && o.betCount>1 ? <small>{o.betCount} 注</small> : null}</span>)}</div></details>}
        </article>})}
      </section>;
    })}
  </div>;
}
