// Fair gross-return odds: independent uniform draws, no edge and no refunds.
// These are model defaults, not transcribed market odds or approved settlements.
export type StandardAward = {award:string;total:number|null;wins:number|null;exact:string|null;value:string|null;formula:string;note:string;betCount?:number};
function gcd(a:number,b:number):number { return b ? gcd(b,a%b) : a; }
export function fairAward(award:string,total:number,wins:number,note=""):StandardAward {
  if(wins<=0 || wins>total) throw new Error("Invalid winning outcome count");
  const divisor=gcd(total,wins);
  return {award,total,wins,exact:`${total/divisor}/${wins/divisor}`,value:(total/wins).toFixed(6),formula:`${total} ÷ ${wins}`,note};
}
const pending=(note:string):StandardAward[]=>[{award:"待确认",total:null,wins:null,exact:null,value:null,formula:"",note}];
function normalizedBPlateAward(award:string,wins:number,marketOdds:number,note:string):StandardAward {
  const marketReturn=(75*1.999+15*2.94+10)/216;
  const rawNumerator=Math.round(marketOdds*1000)*216;
  const rawDenominator=204025;
  const divisor=gcd(rawNumerator,rawDenominator);
  return {award,total:216,wins,exact:`${rawNumerator/divisor}/${rawDenominator/divisor}`,value:(marketOdds/marketReturn).toFixed(6),formula:`${marketOdds} ÷ ${marketReturn.toFixed(9)}`,note};
}
function choose(n:number,k:number) { let value=1; for(let i=1;i<=k;i++) value=value*(n-i+1)/i; return value; }
const distributions=new Map<string,Map<number,number>>();
function distribution(base:number,n:number,kind:"sum"|"span"|"groupSum") {
  const key=`${base}:${n}:${kind}`;
  if(distributions.has(key)) return distributions.get(key)!;
  const counts=new Map<number,number>();
  function walk(values:number[]) {
    if(values.length<n){for(let d=base===6?1:0;d<(base===6?7:10);d++)walk([...values,d]);return;}
    if(kind==="groupSum" && new Set(values).size===1) return;
    const value=kind==="span" ? Math.max(...values)-Math.min(...values) : values.reduce((a,b)=>a+b,0);
    counts.set(value,(counts.get(value)??0)+1);
  }
  walk([]); distributions.set(key,counts); return counts;
}
export function directSumCombinationCount(sum:number) { return distribution(10,3,"sum").get(sum) ?? 0; }
export function twoDigitSumCombinationCount(sum:number) { return distribution(10,2,"sum").get(sum) ?? 0; }
export function twoDigitSpanCombinationCount(span:number) { return distribution(10,2,"span").get(span) ?? 0; }
export function twoDigitGroupSumCombinationCount(sum:number) { return (distribution(10,2,"groupSum").get(sum) ?? 0) / 2; }
export function directSpanCombinationCount(span:number) { return distribution(10,3,"span").get(span) ?? 0; }
export function groupSumComponents(sum:number) {
  let group3Outcomes=0,group6Outcomes=0;
  for(let a=0;a<10;a++)for(let b=0;b<10;b++)for(let c=0;c<10;c++){
    if(a+b+c!==sum)continue;
    const distinct=new Set([a,b,c]).size;
    if(distinct===2)group3Outcomes++;
    if(distinct===3)group6Outcomes++;
  }
  return {group3Bets:group3Outcomes/3,group6Bets:group6Outcomes/6,group3Outcomes,group6Outcomes};
}
export function groupSumCombinationCount(sum:number) {
  const parts=groupSumComponents(sum);
  return parts.group3Bets+parts.group6Bets;
}
function k3SumPropertyAwards() {
  return [
    fairAward("大单",216,61,"和值11–18且为奇数；三同号参与中奖；含本金、无抽水"),
    fairAward("小单",216,47,"和值3–10且为奇数；三同号参与中奖；含本金、无抽水"),
    fairAward("大双",216,47,"和值11–18且为偶数；三同号参与中奖；含本金、无抽水"),
    fairAward("小双",216,61,"和值3–10且为偶数；三同号参与中奖；含本金、无抽水"),
    fairAward("大",216,108,"和值11–18；三同号参与中奖；含本金、无抽水"),
    fairAward("小",216,108,"和值3–10；三同号参与中奖；含本金、无抽水"),
    fairAward("单",216,108,"和值为奇数；三同号参与中奖；含本金、无抽水"),
    fairAward("双",216,108,"和值为偶数；三同号参与中奖；含本金、无抽水"),
  ];
}
export function standardOdds(game:string,name:string):StandardAward[] {
  const note="独立等概率开奖；含本金、无抽水；未中奖不退本金；按单个基础注计算";
  const one=(award:string,total:number,wins:number,extra="")=>[fairAward(award,total,wins,extra||note)];
  if(game==="k3") {
    if(name==="和值") return [
      ...[...distribution(6,3,"sum")].sort((a,b)=>a[0]-b[0]).map(([v,w])=>fairAward(String(v),216,w,"三同号参与和值中奖；含本金、无抽水")),
      ...k3SumPropertyAwards(),
    ];
    if(name==="和值大小单双") return k3SumPropertyAwards();
    if(name==="三同号单选") return one("任一指定三同号",216,1);
    if(name==="三同号通选") return one("任意三同号",216,6);
    if(name==="三同号") return [
      ...Array.from({length:6},(_,i)=>fairAward(`${i+1}${i+1}${i+1}`,216,1,"指定三同号；含本金、无抽水")),
      fairAward("三同号通选",216,6,"任意三同号；含本金、无抽水"),
    ];
    if(name==="二同号单选") return one("指定对子＋指定不同号",216,3);
    if(name==="二同号复选") return one("任一指定对子",216,16,"开奖号码包含指定对子即中奖；包含15种二同号排列及1种对应三同号，共16种中奖结果；含本金、无抽水");
    if(name==="二同号") return [
      fairAward("单选",216,3,"指定对子＋指定不同号；3种排列中奖；含本金、无抽水"),
      ...Array.from({length:6},(_,i)=>fairAward(`${i+1}${i+1}*`,216,16,"复选包含15种二同号排列及1种对应三同号，共16种中奖结果；含本金、无抽水")),
    ];
    if(name==="三不同号" || name==="任选三" || name==="三不同号胆拖") return one("每组指定三个不同点数",216,6);
    if(name==="二不同号" || name==="任选二" || name==="二不同号胆拖") return one("每组指定两个不同点数",216,30);
    if(name==="三连号单选") return one("每组指定三连号",216,6);
    if(name==="三连号通选") return one("任意三连号",216,24);
    if(name==="任选一A盘") return one("每个指定点数",216,91,"每个所选点数独立判断；该点数在开奖号码中至少出现一次即中1个奖项，同一点数重复出现不重复派奖；最多同时命中3个不同点数；含本金、无抽水");
    if(name==="任选一B盘") return [
      normalizedBPlateAward("任一一星",75,1.999,"同一所选点数恰好出现1次；与二星、三星互斥；按老竞品三档奖级比例统一归一化至100%理论返奖率"),
      normalizedBPlateAward("任一二星",15,2.94,"同一所选点数恰好出现2次；与一星、三星互斥；按老竞品三档奖级比例统一归一化至100%理论返奖率"),
      normalizedBPlateAward("任一三星",1,10,"同一所选点数恰好出现3次；与一星、二星互斥；按老竞品三档奖级比例统一归一化至100%理论返奖率"),
    ];
    return pending("具体派奖规则待确认");
  }
  const n=/^(前二|后二)/.test(name)?2:/^(前四|后四)/.test(name)?4:name.startsWith("五星")?5:3;
  const total=10**n;
  if(name==="定位胆")return one("每一位置的指定号码",10,1);
  if(name==="龙虎和") return [
    fairAward("龙",100,45,"比较指定两位：前位大于后位；100种等概率结果中45种中奖；含本金、无抽水"),
    fairAward("虎",100,45,"比较指定两位：前位小于后位；100种等概率结果中45种中奖；含本金、无抽水"),
    fairAward("和",100,10,"比较指定两位：两位号码相同；100种等概率结果中10种中奖；含本金、无抽水"),
  ];
  if(name==="组合大小单双") return [
    fairAward("大单",100000,26508,"五星和值23–45且为奇数；含本金、无抽水"),
    fairAward("小单",100000,23492,"五星和值0–22且为奇数；含本金、无抽水"),
    fairAward("大双",100000,23492,"五星和值23–45且为偶数；含本金、无抽水"),
    fairAward("小双",100000,26508,"五星和值0–22且为偶数；含本金、无抽水"),
  ];
  if(/^(前二|后二)直选和值A面$/.test(name)) return Array.from({length:19},(_,sum)=>({
    ...fairAward(String(sum),100,1,`选择该和值后拆分为对应数量的有序${name.slice(0,2)}直选注；含本金、无抽水；同期开奖最多命中其中一注`),
    betCount:twoDigitSumCombinationCount(sum),
  }));
  if(/^(前二|后二)直选跨度A面$/.test(name)) return Array.from({length:10},(_,span)=>({
    ...fairAward(String(span),100,1,`选择该跨度后拆分为对应数量的有序${name.slice(0,2)}直选注；含本金、无抽水；同期开奖最多命中其中一注`),
    betCount:twoDigitSpanCombinationCount(span),
  }));
  if(/^(前二|后二)组选和值A面$/.test(name)) return Array.from({length:17},(_,index)=>index+1).map(sum=>({
    ...fairAward(String(sum),100,2,`选择该和值后拆分为对应数量的${name.slice(0,2)}组选基础注；每注覆盖正反2种排列；含本金、无抽水；同期开奖最多命中其中一注`),
    betCount:twoDigitGroupSumCombinationCount(sum),
  }));
  if(/^(前二|后二)组选包胆A面$/.test(name)) return Array.from({length:10},(_,digit)=>({
    ...fairAward(String(digit),100,2,`选择包胆号码${digit}后，与其余9个不同号码组成9个${name.slice(0,2)}组选基础注；每注覆盖正反2种排列；含本金、无抽水`),
    betCount:9,
  }));
  if(/^(前|中|后)三直选和值A面$/.test(name)) return Array.from({length:28},(_,sum)=>({
    ...fairAward(String(sum),1000,1,"选择该和值后拆分为对应数量的有序直选注；含本金、无抽水；同期开奖最多命中其中一注"),
    betCount:directSumCombinationCount(sum),
  }));
  if(/^(前|中|后)三直选跨度A面$/.test(name)) return Array.from({length:10},(_,span)=>({
    ...fairAward(String(span),1000,1,"选择该跨度后拆分为对应数量的有序三位直选注；含本金、无抽水；同期开奖最多命中其中一注"),
    betCount:directSpanCombinationCount(span),
  }));
  if(/^(前|中|后)三组选和值A面$/.test(name)) return Array.from({length:26},(_,index)=>index+1).flatMap(sum=>{
    const parts=groupSumComponents(sum);
    const awards:StandardAward[]=[];
    if(parts.group3Bets) awards.push({...fairAward(`${sum}·组三`,1000,3,`选择和值${sum}拆分为${groupSumCombinationCount(sum)}个基础组选注；其中组三${parts.group3Bets}注；含本金、无抽水`),betCount:parts.group3Bets});
    if(parts.group6Bets) awards.push({...fairAward(`${sum}·组六`,1000,6,`选择和值${sum}拆分为${groupSumCombinationCount(sum)}个基础组选注；其中组六${parts.group6Bets}注；含本金、无抽水`),betCount:parts.group6Bets});
    return awards;
  });
  if(/^(前|中|后)三组选包胆A面$/.test(name)) return Array.from({length:10},(_,digit)=>[
    {...fairAward(`${digit}·组三`,1000,3,`选择包胆号码${digit}拆分54注：组三18注（所选号码可作重号或单号）；含本金、无抽水`),betCount:18},
    {...fairAward(`${digit}·组六`,1000,6,`选择包胆号码${digit}拆分54注：组六36注（另外9个号码中任选2个）；含本金、无抽水`),betCount:36},
  ]).flat();
  if(/^(前|中|后)三组选包胆B面$/.test(name)) return Array.from({length:10},(_,digit)=>[
    {...fairAward(`${digit}·组三`,1000,162,`每个包胆号码计1注，覆盖54个基础组选组合；组三基础赔率333.333333÷54；含本金、无抽水`),betCount:1},
    {...fairAward(`${digit}·组六`,1000,324,`每个包胆号码计1注，覆盖54个基础组选组合；组六基础赔率166.666667÷54；含本金、无抽水`),betCount:1},
  ]).flat();
  if(/^(前|中|后)三组选和值B面$/.test(name)) return Array.from({length:26},(_,index)=>index+1).flatMap(sum=>{
    const parts=groupSumComponents(sum);
    const coveredBets=parts.group3Bets+parts.group6Bets;
    const awards:StandardAward[]=[];
    if(parts.group3Bets) awards.push({...fairAward(`${sum}·组三`,1000,3*coveredBets,`选择和值${sum}只计1注；覆盖${parts.group3Outcomes}个组三排列和${parts.group6Outcomes}个组六排列；按组三奖级结算；含本金、无抽水`),betCount:1});
    if(parts.group6Bets) awards.push({...fairAward(`${sum}·组六`,1000,6*coveredBets,`选择和值${sum}只计1注；覆盖${parts.group3Outcomes}个组三排列和${parts.group6Outcomes}个组六排列；按组六奖级结算；含本金、无抽水`),betCount:1});
    return awards;
  });
  if(/^(前|中|后)三直选组合$/.test(name)) return [
    fairAward("三星",1000,1,"三个指定位置全部命中；含本金、无抽水"),
    fairAward("二星",1000,10,"末两个指定位置命中；含本金、无抽水"),
    fairAward("一星",1000,100,"末一个指定位置命中；含本金、无抽水"),
  ];
  if(name==="梭哈") return [
    fairAward("五梅",100000,10,"五位号码全部相同；含本金、无抽水"),
    fairAward("炸弹",100000,450,"恰好四个号码相同，另一个号码不同；含本金、无抽水"),
    fairAward("顺子",100000,840,"按规则共7组连续号码：01234、12345、23456、34567、45678、56789、67890；每组有5!=120种排列；含本金、无抽水"),
    fairAward("葫芦",100000,900,"一个三重号加一个对子；含本金、无抽水"),
    fairAward("三条",100000,7200,"恰好一个三重号加两个互不相同的单号；含本金、无抽水"),
    fairAward("两对",100000,10800,"恰好两个对子加一个不同单号；含本金、无抽水"),
    fairAward("五散",100000,29400,"五个号码全部不同且不构成规则定义的7组顺子；含本金、无抽水"),
    fairAward("单对",100000,50400,"恰好一个对子加三个互不相同的单号；含本金、无抽水"),
  ];
  if(name.includes("组合"))return pending("组合计注、形态边界或和局退本金规则待确认");
  if(name.includes("组选") && (name.includes("和值")||name.includes("包胆")) && n===3) return pending("同一投注项含组三/组六多奖级；该面计注与奖级分配仍待确认");
  if(name.includes("A面") && (name.includes("和值")||name.includes("跨度")||name.includes("包胆"))) return pending("A面按组合拆注还是按单个投注项计注待确认，不能直接沿用B面计算值");
  if(name.includes("和值尾数"))return one("每个指定尾数",total,total/10);
  if(name.includes("和值") || name.includes("跨度")) {
    const kind=name.includes("跨度")?"span":name.includes("组选")?"groupSum":"sum";
    return [...distribution(10,n,kind)].sort((a,b)=>a[0]-b[0]).map(([v,w])=>fairAward(String(v),total,w,note));
  }
  if(name.includes("包胆") && n===2)return one("每个指定包胆号码",100,18,"包含指定号码且不为对子；未中不退本金");
  if(name.includes("不定位")) {
    const k=name.includes("三码")?3:name.includes("二码")?2:1;
    let wins=0; for(let j=0;j<=k;j++)wins+=(-1)**j*choose(k,j)*(10-j)**n;
    return one(`每组指定${k}个不同号码`,total,wins);
  }
  if(name.includes("大小单双"))return one("各位置属性同时命中的一组",2**n,1,"每个位置属性概率1/2，按各位置同时命中的组合计注，不是单位置赔率");
  if(name.includes("直选"))return one("一等奖（指定有序号码）",total,1);
  if(name.endsWith("组三"))return one("指定重号与单号的一注",1000,3,"112与122属于不同基础注，各自有3种排列");
  if(name.endsWith("组六"))return one("指定三个不同号码",1000,6);
  const shape=name.match(/组选(120|60|30|20|10|5|24|12|6|4)$/);
  if(shape)return one("一等奖（指定号码及重复次数）",total,Number(shape[1]));
  if(n===2 && name.includes("组选"))return one("指定两个不同号码",100,2);
  if(name.includes("混合通选"))return [fairAward("组三通选",1000,270,note),fairAward("组六通选",1000,720,note)];
  if(name.includes("特殊号"))return [
    fairAward("豹子",1000,10,note),
    fairAward("对子",1000,270,note),
    fairAward("顺子",1000,60,"顺子按10组连续号码012、123、234、345、456、567、678、789、890、901计算，每组6种排列；含本金、无抽水"),
  ];
  const repeats=["一帆风顺","好事成双","三星报喜","四季发财"].indexOf(name)+1;
  if(repeats){let wins=0;for(let i=repeats;i<=5;i++)wins+=choose(5,i)*9**(5-i);return one(`指定号码至少出现${repeats}次`,100000,wins);}
  return pending("暂无可计算的完整规则");
}
export function displayStandard(value:string|null) {
  if(value===null) return "待确认";
  const match=/^(-?)(\d+)(?:\.(\d*))?$/.exec(value.trim());
  if(!match) return value;
  return `${match[1]}${match[2]}.${(match[3]??"").padEnd(2,"0").slice(0,2)}`;
}
