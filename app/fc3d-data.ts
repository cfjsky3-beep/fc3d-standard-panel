import sourceRows from "./data/fc3d-source.json";

export const fc3dVideoFile = "开云彩票娱乐在线配置采集-2026-10-06";

type SourceAward = { level:number; rate:string; bonus:number };
type SourceRow = { id:number; code:string; group:string; name:string; description:string; example:string; awards:SourceAward[]; limit:string };

type LiveConfig = Pick<SourceRow,"id"|"code"|"group"|"name"|"awards"|"limit"> & { source:string };

const one = (bonus:number):SourceAward[] => [{level:1,rate:"0.98",bonus}];
const liveConfigs:LiveConfig[] = [
  {source:"后三直选复式",id:16010101,code:"sanxingzhixuanfushi",group:"三星",name:"三星直选复式",awards:one(1000),limit:"10"},
  {source:"后三直选单式",id:16010102,code:"sanxingzhixuandanshi",group:"三星",name:"三星直选单式",awards:one(1000),limit:"10"},
  {source:"后三直选和值",id:16010103,code:"sanxingzhixuanhezhi",group:"三星",name:"三星直选和值",awards:one(1000),limit:"10"},
  {source:"后三直选跨度",id:16010104,code:"sanxingzhixuankuadu",group:"三星",name:"三星直选跨度",awards:one(1000),limit:"0"},
  {source:"后三组选三",id:16010201,code:"sanxingzuxuansan",group:"三星",name:"三星组选三复式",awards:one(333.3333),limit:"2"},
  {source:"后三组选六",id:16010202,code:"sanxingzuxuanliu",group:"三星",name:"三星组选六复式",awards:one(166.6666),limit:"1"},
  {source:"后三混合组选",id:16010203,code:"sanxinghunhezuxuan",group:"三星",name:"三星混合组选",awards:[{level:1,rate:"0.98",bonus:333.3333},{level:2,rate:"0.98",bonus:166.6666}],limit:"1"},
  {source:"后三组选和值",id:16010204,code:"sanxingzuxuanhezhi",group:"三星",name:"三星组选和值",awards:[{level:1,rate:"0.98",bonus:333.3333},{level:2,rate:"0.98",bonus:166.6666}],limit:"1"},
  {source:"后三组选包胆",id:16010205,code:"sanxingzuxuanbaodan",group:"三星",name:"三星组选包胆",awards:[{level:1,rate:"0.98",bonus:333.3333},{level:2,rate:"0.98",bonus:166.6666}],limit:"0"},
  {source:"后三通选复式",id:16010301,code:"sanxingtongxuanfushi",group:"三星",name:"三星通选复式",awards:[{level:1,rate:"0.98",bonus:460},{level:2,rate:"0.98",bonus:20}],limit:"10"},
  {source:"后三通选单式",id:16010302,code:"sanxingtongxuandanshi",group:"三星",name:"三星通选单式",awards:[{level:1,rate:"0.98",bonus:460},{level:2,rate:"0.98",bonus:20}],limit:"10"},
  {source:"前二直选复式",id:16020101,code:"qianerzhixuanfushi",group:"前二",name:"前二直选复式",awards:one(100),limit:"1"},
  {source:"前二直选单式",id:16020102,code:"qianerzhixuandanshi",group:"前二",name:"前二直选单式",awards:one(100),limit:"1"},
  {source:"前二直选和值",id:16020103,code:"qianerzhixuanhezhi",group:"前二",name:"前二直选和值",awards:one(100),limit:"0"},
  {source:"前二直选跨度",id:16020104,code:"qianerzhixuankuadu",group:"前二",name:"前二直选跨度",awards:one(100),limit:"0"},
  {source:"前二组选复式",id:16020201,code:"qianerzuxuafushi",group:"前二",name:"前二组选复式",awards:one(50),limit:"0"},
  {source:"前二组选单式",id:16020202,code:"qianerzuxuadanshi",group:"前二",name:"前二组选单式",awards:one(50),limit:"0"},
  {source:"前二组选和值",id:16020203,code:"qianerzuxuanhezhi",group:"前二",name:"前二组选和值",awards:one(50),limit:"0"},
  {source:"前二组选包胆",id:16020204,code:"qianerzuxuanbaodan",group:"前二",name:"前二组选包胆",awards:one(50),limit:"0"},
  {source:"后二直选复式",id:16030301,code:"houerzhixuanfushi",group:"后二",name:"后二直选复式",awards:one(100),limit:"1"},
  {source:"后二直选单式",id:16030302,code:"houerzhixuandanshi",group:"后二",name:"后二直选单式",awards:one(100),limit:"1"},
  {source:"后二直选和值",id:16030303,code:"houerzhixuanhezhi",group:"后二",name:"后二直选和值",awards:one(100),limit:"0"},
  {source:"后二直选跨度",id:16030304,code:"houerzhixuankuadu",group:"后二",name:"后二直选跨度",awards:one(100),limit:"0"},
  {source:"后二组选复式",id:16030401,code:"houerzuxuanfushi",group:"后二",name:"后二组选复式",awards:one(50),limit:"0"},
  {source:"后二组选单式",id:16030402,code:"houerzuxuandanshi",group:"后二",name:"后二组选单式",awards:one(50),limit:"0"},
  {source:"后二组选和值",id:16030403,code:"houerzuxuanhezhi",group:"后二",name:"后二组选和值",awards:one(50),limit:"0"},
  {source:"后二组选包胆",id:16030404,code:"houerzuxuanbaodan",group:"后二",name:"后二组选包胆",awards:one(50),limit:"0"},
  {source:"定位胆",id:16040101,code:"dingweidan",group:"定位胆",name:"定位胆",awards:one(10),limit:"0"},
  {source:"后三一码不定胆",id:16050101,code:"sanxingyimabudingdan",group:"不定胆",name:"三星一码不定胆",awards:one(3.69),limit:"0"},
  {source:"后三二码不定胆",id:16050102,code:"sanxingermabudingdan",group:"不定胆",name:"三星二码不定胆",awards:one(18.515),limit:"0"},
  {source:"龙虎和",id:16060101,code:"longhuhe",group:"龙虎",name:"龙虎和",awards:[{level:1,rate:"0.98",bonus:10},{level:2,rate:"0.98",bonus:2.2222}],limit:"0"},
];

const referenceRows = sourceRows as SourceRow[];
export const fc3dSourceRows:SourceRow[] = liveConfigs.map((config) => {
  const reference = referenceRows.find((row) => row.name === config.source);
  if (!reference) throw new Error(`缺少玩法说明参考：${config.source}`);
  const rewrite = (value:string) => value
    .replaceAll("后三", "三星")
    .replaceAll("排列3/5", "福彩3D")
    .replaceAll("万位、千位", "百位、十位")
    .replaceAll("万千和", "百十和")
    .replaceAll("*,*,", "")
    .replaceAll("。。", "。");
  const description = config.name === "定位胆"
    ? "从百位、十位、个位任意位置选择1个号码组成1注，所选号码与相同位置上的开奖号码一致，即中奖。"
    : rewrite(reference.description);
  const example = config.name === "定位胆"
    ? "投注方案：3,-,-；\n开奖号码：3,*,*，即中奖。"
    : rewrite(reference.example);
  return {...reference,...config,description,example};
});
const groupOrder = ["三星", "前二", "后二", "定位胆", "不定胆", "龙虎"];

export const fc3dGroups = groupOrder.map((title) => ({
  title,
  items: fc3dSourceRows.filter((row) => row.group === title).map((row) => row.name),
})).filter((group) => group.items.length);

const rowsByName = Object.fromEntries(fc3dSourceRows.map((row) => [row.name, row]));

function awardLabels(name:string, count:number) {
  if (name.endsWith("直选组合")) {
    const stars = name.startsWith("五星") ? 5 : name.startsWith("前四") || name.startsWith("后四") ? 4 : 3;
    return Array.from({length:count}, (_, index) => `${stars-index}星奖`);
  }
  if (count > 1 && (name.includes("混合组选") || name.includes("组选和值") || name.includes("组选包胆"))) return ["组三", "组六"];
  if (name.includes("通选")) return ["三星奖", "二星奖"];
  if (name === "龙虎和") return ["龙、虎", "和"];
  if (name === "梭哈") return ["四条", "葫芦", "顺子", "三条", "两对", "单牌", "一对"];
  if (name === "三星炸金花") return ["豹子", "顺子", "对子", "杂六", "半顺"];
  if (name === "牛牛") return ["牛1、牛3、牛5、牛7、牛9", "牛牛", "牛2、牛4、牛6、牛8", "牛单", "牛小", "牛大", "牛双", "无牛"];
  return Array.from({length:count}, (_, index) => count === 1 ? "一等奖" : `奖级${index+1}`);
}

function truncateFour(value:number) {
  return (Math.floor((value + Number.EPSILON) * 10000) / 10000).toFixed(4).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

// 开云彩票福彩3D标准盘于 2026-10-06 实际展示的赔率：基础奖金×返奖率 0.98。
export const fc3dObservedOdds: Record<string, Record<string,string>> = Object.fromEntries(fc3dSourceRows.map((row) => {
  const labels = awardLabels(row.name, row.awards.length);
  return [row.name, Object.fromEntries(row.awards.map((award, index) => [labels[index], truncateFour(award.bonus * Number(award.rate))]))];
}));

export function fc3dHelp(name:string) {
  const row = rowsByName[name];
  if (!row) return {title:name, text:"该玩法未在竞品当前启用配置中。", bet:"待补充", sample:"待补充"};
  const lines = row.example.replace(/<br\s*\/?>/gi, "\n").split("\n").map((line) => line.trim()).filter(Boolean);
  const betLines = lines.filter((line) => line.startsWith("投注方案"));
  const sampleLines = lines.filter((line) => line.startsWith("开奖号码"));
  const bet = (betLines.length ? betLines : [lines[0] ?? "待补充"])
    .map((line) => line.replace(/^投注方案[A-Z]?[：:；;]\s*/, "").replace(/[；;]\s*$/, ""))
    .join("\n");
  const sample = (sampleLines.length ? sampleLines : [lines.slice(1).join("\n") || "待补充"])
    .map((line) => line
      .replace(/^开奖号码[A-Z]?[：:；;]\s*/, "")
      .replace(/[，,]?\s*即中奖[。．.]?\s*$/, `，即中${row.name}。`))
    .join("\n");
  return { title:row.name, text:row.description, bet, sample };
}

export const fc3dSourceMeta = {
  capturedAt: "2026-10-06",
  activePlayCount: fc3dSourceRows.length,
  helpPlayCount: fc3dSourceRows.length,
  excludedHelpOnlyPlay: "",
  note: "玩法与赔率按开云彩票福彩3D当前标准盘接口录入；说明沿用老竞品的玩法、投注方案、开奖号码格式重新编写。",
};
