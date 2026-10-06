"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { sscGroups, sscHelp, positionsFor, oddsText } from "./ssc-data";
import { directSpanCombinationCount, directSumCombinationCount, displayStandard, groupSumCombinationCount, standardOdds, twoDigitGroupSumCombinationCount, twoDigitSpanCombinationCount, twoDigitSumCombinationCount } from "./standard-odds";
import { SeedTable } from "./seed-table";
import { RulesCatalog } from "./rules-catalog";
import { fc3dGroups, fc3dHelp, fc3dObservedOdds } from "./fc3d-data";

type Game = "ssc" | "k3" | "fc3d";
type Panel = "double" | "standard";
type SpecTab = "design" | "interaction" | "fields" | "rules";
type AdminTab = "central" | "merchant" | "seed";
type Surface = "client" | AdminTab;
type Choice = { label: string; note?: string; db?: boolean };
type Row = { title: string; choices: Choice[]; hint?: string; helpers?: boolean };

const digits = Array.from({ length: 10 }, (_, i) => ({ label: String(i) }));
const dice = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const k3Groups = [
  { title: "和值", items: ["和值", "和值大小单双"] },
  { title: "三同号", items: ["三同号"] },
  { title: "二同号", items: ["二同号"] },
  { title: "不同号", items: ["三不同号", "二不同号"] },
  { title: "连号", items: ["三连号单选", "三连号通选"] },
  { title: "任选", items: ["任选一A盘", "任选一B盘", "任选二", "任选三"] },
  { title: "胆拖", items: ["三不同号胆拖", "二不同号胆拖"] },
];
const sscMenus = sscGroups.flatMap((group) => group.items);
const k3Menus = k3Groups.flatMap((group) => group.items);
const fc3dMenus = fc3dGroups.flatMap((group) => group.items);
const isDigitGame = (game: Game) => game === "ssc" || game === "fc3d";
const gameName = (game: Game) => game === "ssc" ? "5分时时彩" : game === "fc3d" ? "福彩3D" : "澳洲快三";

const quickGames = [
  { group: "时时彩", name: "5分时时彩", icon: "5D", game: "ssc" as Game, color: "#ffad0a" },
  { group: "时时彩", name: "澳洲时时彩", icon: "AU", game: "ssc" as Game, color: "#ff6773" },
  { group: "快三", name: "澳洲快三", icon: "K3", game: "k3" as Game, color: "#2ba4e8" },
  { group: "快三", name: "5分快三", icon: "K3", game: "k3" as Game, color: "#27b38a" },
  { group: "福彩3D", name: "福彩3D", icon: "3D", game: "fc3d" as Game, color: "#459eea" },
];

function digitPositions(game:Game, menu:string) {
  if (game !== "fc3d") return positionsFor(menu);
  if (menu.startsWith("前二")) return ["百位","十位"];
  if (menu.startsWith("后二")) return ["十位","个位"];
  return ["百位","十位","个位"];
}

function displayOdds(game: Game, name: string) {
  const observed = game === "fc3d" ? Object.values(fc3dObservedOdds[name] ?? {}).map(Number).filter(Number.isFinite).sort((a,b)=>a-b) : [];
  if (observed.length === 1) return displayStandard(String(observed[0]));
  if (observed.length > 1) return `${displayStandard(String(observed[0]))}～${displayStandard(String(observed.at(-1)!))}`;
  const values = [...new Set(standardOdds(game, name).flatMap((award) => award.value ? [Number(award.value)] : []))].sort((a, b) => a - b);
  if (values.length === 1) return displayStandard(String(values[0]));
  if (values.length > 1) return `${displayStandard(String(values[0]))}～${displayStandard(String(values.at(-1)!))}`;
  return oddsText(game, name);
}

export function standardOptionOdds(game: Game, menu: string, option: string) {
  if (game === "fc3d") {
    const normalized = option.replace("牛一","牛1").replace("牛二","牛2").replace("牛三","牛3").replace("牛四","牛4").replace("牛五","牛5").replace("牛六","牛6").replace("牛七","牛7").replace("牛八","牛8").replace("牛九","牛9");
    return Object.entries(fc3dObservedOdds[menu] ?? {}).filter(([award]) => award.split("、").includes(normalized) || award === normalized).map(([,value])=>displayStandard(value)).join("/");
  }
  const values = standardOdds(game, menu).flatMap(award => award.value && (award.award === option || award.award.startsWith(`${option}·`)) ? [displayStandard(award.value)] : []);
  return values.join("/");
}

function highestDisplayedOdds(value: string) {
  const values = value.match(/\d+(?:\.\d+)?/g)?.map(Number).filter(Number.isFinite) ?? [];
  return values.length ? Math.max(...values) : null;
}

export function displayPayoutAmount(value: number) {
  return displayStandard(String(value));
}

export function parseSingleEntries(menu: string, value: string) {
  const length = menu.startsWith("五星") ? 5 : /^(前四|后四)/.test(menu) ? 4 : /^(前二|后二)/.test(menu) ? 2 : 3;
  const entries = value.split(/[\s,，;；|]+/).map(item => item.trim()).filter(Boolean);
  return [...new Set(entries.filter(item => {
    if (!new RegExp(`^\\d{${length}}$`).test(item)) return false;
    if (menu.includes("组选单式") && length === 2) return item[0] !== item[1];
    if (menu === "三星混合组选") return new Set(item).size > 1;
    return true;
  }))];
}

function combinationCount(total: number, selected: number) {
  if (selected < 0 || selected > total) return 0;
  let value = 1;
  for (let index = 1; index <= selected; index++) value = value * (total - index + 1) / index;
  return value;
}

export function betCountForSelections(menu: string, selected: string[]) {
  if (/^(三星|前二|后二)(直选|通选)复式$/.test(menu)) {
    const byRow = new Map<string,number>();
    for (const item of selected) {
      const row = item.slice(0,item.indexOf("-"));
      byRow.set(row,(byRow.get(row) ?? 0)+1);
    }
    const required = menu.startsWith("三星") ? 3 : 2;
    return byRow.size === required ? [...byRow.values()].reduce((total,count)=>total*count,1) : 0;
  }
  if (menu === "三星组选三复式") return selected.length >= 2 ? combinationCount(selected.length,2)*2 : 0;
  if (menu === "三星组选六复式") return selected.length >= 3 ? combinationCount(selected.length,3) : 0;
  if (/^(前二|后二)组选复式$/.test(menu)) return selected.length >= 2 ? combinationCount(selected.length,2) : 0;
  if (menu === "三不同号胆拖") {
    const bankers=selected.filter(item=>item.startsWith("胆码-")).length;
    const drags=selected.filter(item=>item.startsWith("拖码-")).length;
    return bankers>=1 && bankers<=2 && bankers+drags>=3 ? combinationCount(drags,3-bankers) : 0;
  }
  if (menu === "二不同号胆拖") {
    const bankers=selected.filter(item=>item.startsWith("胆码-")).length;
    const drags=selected.filter(item=>item.startsWith("拖码-")).length;
    return bankers===1 ? drags : 0;
  }
  if (menu === "二同号") {
    const same = selected.filter(item=>item.startsWith("同号-")).map(item=>item.slice(-2, -1));
    const different = selected.filter(item=>item.startsWith("不同号-")).map(item=>item.slice(-1));
    const compound = selected.filter(item=>item.startsWith("复选-")).length;
    return same.reduce((count,digit)=>count+different.filter(value=>value!==digit).length,0)+compound;
  }
  if (menu.includes("不定位") || menu.includes("不定胆")) {
    const required = menu.includes("三码") ? 3 : menu.includes("二码") ? 2 : 1;
    return combinationCount(selected.length, required);
  }
  if (/^(前|中|后)三组选包胆A面$/.test(menu)) return selected.length * 54;
  if (/^(前|中|后)三组选和值A面$/.test(menu)) return selected.reduce((sum, item) => {
    const value = Number(item.slice(item.lastIndexOf("-") + 1));
    return sum + (Number.isInteger(value) ? groupSumCombinationCount(value) : 0);
  }, 0);
  if (/^(前|中|后)三直选(和值|跨度)A面$/.test(menu)) return selected.reduce((sum, item) => {
    const value = Number(item.slice(item.lastIndexOf("-") + 1));
    if (!Number.isInteger(value)) return sum;
    return sum + (menu.includes("跨度") ? directSpanCombinationCount(value) : directSumCombinationCount(value));
  }, 0);
  if (/^(前二|后二)直选和值A面$/.test(menu)) return selected.reduce((sum, item) => {
    const value = Number(item.slice(item.lastIndexOf("-") + 1));
    return sum + (Number.isInteger(value) ? twoDigitSumCombinationCount(value) : 0);
  }, 0);
  if (/^(前二|后二)直选跨度A面$/.test(menu)) return selected.reduce((sum, item) => {
    const value = Number(item.slice(item.lastIndexOf("-") + 1));
    return sum + (Number.isInteger(value) ? twoDigitSpanCombinationCount(value) : 0);
  }, 0);
  if (/^(前二|后二)组选和值A面$/.test(menu)) return selected.reduce((sum, item) => {
    const value = Number(item.slice(item.lastIndexOf("-") + 1));
    return sum + (Number.isInteger(value) ? twoDigitGroupSumCombinationCount(value) : 0);
  }, 0);
  if (/^(前二|后二)组选包胆A面$/.test(menu)) return selected.length * 9;
  return selected.length;
}

export function toggleSelection(menu: string, selected: string[], key: string) {
  if (selected.includes(key)) return selected.filter(item => item !== key);
  if (menu.includes("包胆")) return [key];
  if (menu === "二同号") {
    if (key.startsWith("同号-")) {
      const digit=key.slice(-2,-1);
      return [...selected.filter(item=>item!==`不同号-${digit}`),key];
    }
    if (key.startsWith("不同号-")) {
      const digit=key.slice(-1);
      return [...selected.filter(item=>item!==`同号-${digit}${digit}`),key];
    }
  }
  if (menu === "三不同号胆拖" || menu === "二不同号胆拖") {
    const [row,label]=key.split("-");
    const opposite=row==="胆码"?"拖码":"胆码";
    let next=selected.filter(item=>item!==`${opposite}-${label}`);
    if (row==="胆码") {
      const bankers=next.filter(item=>item.startsWith("胆码-"));
      const limit=menu==="三不同号胆拖"?2:1;
      if (bankers.length>=limit) next=limit===1 ? next.filter(item=>!item.startsWith("胆码-")) : next.filter(item=>item!==bankers[0]);
    }
    return [...next,key];
  }
  return [...selected, key];
}

export function quickSelectionValues(labels: string[], action: string) {
  const values = labels.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (action === "清") return [];
  if (action === "全") return values.map(String);
  if (action === "单") return values.filter(value => value % 2 === 1).map(String);
  if (action === "双") return values.filter(value => value % 2 === 0).map(String);
  const middle = (values[0] + values.at(-1)!) / 2;
  if (action === "大") return values.filter(value => value > middle).map(String);
  if (action === "小") return values.filter(value => value <= middle).map(String);
  return [];
}

export function maximumPayoutMultiplier(game: Game, panel: Panel, menu: string, selected: string[], displayedOdds: string) {
  if (panel === "standard" && game === "k3" && menu === "二不同号胆拖") {
    const notes=betCountForSelections(menu,selected);
    const award=standardOdds(game,menu)[0]?.value;
    return award && notes ? Number(award)*Math.min(notes,2) : null;
  }
  if (panel === "standard" && game === "k3" && menu === "任选一A盘") {
    const award = standardOdds(game,menu)[0]?.value;
    return award && selected.length ? Number(award)*Math.min(selected.length,3) : null;
  }
  if (panel === "standard" && game === "k3" && menu === "三同号") {
    const hasSingle = selected.some(item=>item.startsWith("单选-"));
    const hasAllTriples = selected.includes("通选-三同号通选");
    if (!hasSingle && !hasAllTriples) return null;
    return (hasSingle ? 216 : 0) + (hasAllTriples ? 36 : 0);
  }
  if (panel === "standard" && game === "k3" && menu === "二同号") {
    const same = selected.filter(item=>item.startsWith("同号-")).map(item=>item.slice(-2,-1));
    const different = selected.filter(item=>item.startsWith("不同号-")).map(item=>item.slice(-1));
    const hasSingle = same.some(digit=>different.some(value=>value!==digit));
    const hasCompound = selected.some(item=>item.startsWith("复选-"));
    if (hasSingle) return 72;
    if (hasCompound) return 13.5;
    return null;
  }
  if (panel === "standard" && game === "ssc" && /^(前|中|后)三直选组合$/.test(menu)) {
    const awards = standardOdds(game, menu).flatMap(award => award.value ? [Number(award.value)] : []);
    return awards.length === 3 ? awards.reduce((sum, value) => sum + value, 0) : null;
  }
  if (panel === "standard") {
    if (game === "ssc" && menu.includes("不定位")) {
      const award = standardOdds(game, menu).find(item => item.value)?.value;
      return award ? Number(award) * maximumSimultaneousWinningNotes(game, panel, menu, selected) : null;
    }
    const selectedOptions = new Set(selected.map(item => item.slice(item.lastIndexOf("-") + 1)));
    const selectedAwards = standardOdds(game, menu).flatMap(award => award.value && [...selectedOptions].some(option => award.award === option || award.award.startsWith(`${option}·`)) ? [Number(award.value)] : []);
    if (selectedAwards.length) {
      if (/^(前|中|后)三组选包胆A面$/.test(menu)) return Math.max(...selectedAwards) * Math.min(selected.length, 2);
      return Math.max(...selectedAwards);
    }
  }
  const highest = highestDisplayedOdds(displayedOdds);
  return highest === null ? null : highest * maximumSimultaneousWinningNotes(game, panel, menu, selected);
}

export function maximumSimultaneousWinningNotes(game: Game, panel: Panel, menu: string, selected: string[]) {
  if (!selected.length) return 0;
  const selectedByRow = new Map<string, string[]>();
  for (const item of selected) {
    const separator = item.indexOf("-");
    const row = item.slice(0, separator);
    const label = item.slice(separator + 1);
    selectedByRow.set(row, [...(selectedByRow.get(row) ?? []), label]);
  }
  if (panel === "double" || menu.includes("大小单双")) {
    if (game === "ssc" && menu === "组合大小单双") return 1;
    const matches = (digit: number, label: string) => label.includes("大") ? digit >= 5 : label.includes("小") ? digit <= 4 : label.includes("单") ? digit % 2 === 1 : label.includes("双") ? digit % 2 === 0 : false;
    return [...selectedByRow.values()].reduce((sum, labels) => sum + Math.max(...Array.from({length:10}, (_, digit) => labels.filter(label => matches(digit, label)).length)), 0);
  }
  if (game === "ssc" && menu === "定位胆") return selectedByRow.size;
  if (isDigitGame(game) && (menu.includes("不定位") || menu.includes("不定胆"))) {
    const required = menu.includes("三码") ? 3 : menu.includes("二码") ? 2 : 1;
    const positions = game === "fc3d" ? 3 : menu.startsWith("五星") ? 5 : /^(前四|后四)/.test(menu) ? 4 : /^(前二|后二)/.test(menu) ? 2 : 3;
    return combinationCount(Math.min(selected.length, positions), required);
  }
  if (game === "ssc" && ["一帆风顺", "好事成双", "三星报喜", "四季发财"].includes(menu)) {
    const required = ["一帆风顺", "好事成双", "三星报喜", "四季发财"].indexOf(menu) + 1;
    return Math.min(selected.length, Math.floor(5 / required));
  }
  // 直选、组选、和值、跨度等同一期结果只会命中当前组合中的一个奖项。
  return 1;
}

function helpFor(game: Game, menu: string) {
  if (game === "fc3d" && menu !== "双面盘") return fc3dHelp(menu);
  if (game === "ssc" && menu !== "双面盘") return sscHelp(menu);
  if (game === "k3") {
    if (menu === "和值") return { title: menu, text: "三枚骰子的点数相加得到和值3–18，可投注具体和值或大单、小单、大双、小双、大、小、单、双属性。三同号参与全部和值及属性派奖。", bet: "选择和值8或小双", sample: "开奖号码1、3、4，和值为8，同时命中和值8、小双、小、双。" };
    if (menu === "和值大小单双") return { title: menu, text: "按三枚骰子和值判断属性：3–10为小，11–18为大；奇数为单，偶数为双，并可组合投注大单、小单、大双、小双。三同号参与中奖。", bet: "选择小双", sample: "开奖号码1、3、4，和值8，为小双。" };
    if (menu === "三同号") return { title: menu, text: "单选：选择一组指定三同号，开奖结果与所选号码一致即中奖。通选：当期三枚骰子点数相同即中奖，不限定具体点数。", bet: "单选333；或选择三同号通选", sample: "开奖号码3、3、3时，命中单选333及三同号通选。" };
    if (menu === "二同号") return { title: menu, text: "单选：在同号区选择一个对子，并在不同号区选择一个与对子点数不同的号码，开奖号码组成一致即中奖。复选：选择一组对子，开奖号码包含该对子即中奖，对应三同号也中奖。", bet: "单选选择22＋不同号5；或复选22*", sample: "开奖号码2、2、5命中单选22＋5及复选22*；开奖号码2、2、2也命中复选22*。" };
    if (menu.includes("连号")) return { title: menu, text: "开奖号码由三个连续点数组成；单选需与所选连续组合一致，通选命中任一连续组合即可。", bet: "选择 2、3、4", sample: "开奖号码 2、3、4。" };
    if (menu === "三不同号") return { title: menu, text: "从 1–6 中至少选择三个不同点数，开奖号码为三个不同点数且包含所选组合即中奖；号码顺序不限。", bet: "选择 2、4、6", sample: "开奖号码 6、2、4。" };
    if (menu === "二不同号") return { title: menu, text: "从 1–6 中至少选择两个不同点数，开奖号码中同时包含所选两个点数即中奖；第三枚骰子点数不限。", bet: "选择 2、5", sample: "开奖号码 2、5、5。" };
    if (menu === "三不同号胆拖") return { title: menu, text: "选1~2个胆码，选1~5个拖码，胆码加拖码不少于3个；选号与奖号相同即中奖。（固定不变的号码为胆码，其他变化的号码为拖码，简称胆拖。）", bet: "胆码选择2，拖码选择4、5、6，组成245、246、256共3注。", sample: "开奖号码2、4、6，与其中一注246相同，即中三不同号胆拖。" };
    if (menu === "二不同号胆拖") return { title: menu, text: "选1个胆码，选1~5个拖码，胆码加拖码不小于2个；选号与奖号任意2号相同即中奖。（固定不变的号码为胆码，其他变化的号码为拖码，简称胆拖。）", bet: "胆码选择2，拖码选择4、5、6，组成24、25、26共3注。", sample: "开奖号码2、5、5，包含胆码2和拖码5，即中二不同号胆拖。" };
    if (menu === "任选一A盘") return { title: menu, text: "从1–6中选择一个或多个点数，每个所选点数独立判断。开奖号码出现几个不同的已选点数，就累加几个奖项；同一点数重复出现只派奖一次，最多同时命中3个不同点数。", bet: "选择点数1、3、6", sample: "开奖号码1、3、6时命中3个奖项；开奖号码1、1、3时命中2个奖项。" };
    if (menu === "任选一B盘") return { title: menu, text: "每选择1个号码计1注，并单独判断该号码在三枚骰子中出现的次数：出现1次中任一一星，出现2次中任一二星，出现3次中任一三星，没有出现则不中奖。同一个号码只按实际出现次数对应的星级派奖，不兼中；选择多个号码时，各号码分别判断，可以同时中奖。", bet: "选择点数1、2、4，共3注。", sample: "开奖号码1、2、4时，三个所选号码各出现1次，共中3个任一一星，不是任一三星；开奖号码1、1、4时，号码1中任一二星，号码4中任一一星。" };
    if (menu === "任选二") return { title: menu, text: "从 1–6 中至少选择两个不同点数，开奖号码中同时出现任意两个所选点数即中奖。", bet: "选择 2、5", sample: "开奖号码 2、5、6。" };
    if (menu === "任选三") return { title: menu, text: "从 1–6 中至少选择三个不同点数，开奖号码包含任一组三个所选点数即中奖。", bet: "选择 1、3、6", sample: "开奖号码 6、1、3。" };
    return { title: menu, text: "开奖号码包含所选点数并满足当前玩法要求即中奖；具体赔率、封盘及特殊排除条件读取后台配置。", bet: "选择点数 3", sample: "开奖号码包含点数 3。" };
  }
  if (menu === "定位胆") return { title: "定位胆", text: "在万、千、百、十、个任意位置至少选择一个号码；所选号码与同一位置上的开奖号码一致即中奖。", bet: "第一位选择 01", sample: "第一位开出 1，即中定位胆。" };
  if (menu.includes("直选")) return { title: menu, text: "在指定位置分别选择号码，所选号码与相同位置的开奖号码及顺序完全一致即中奖。", bet: "百位 3、十位 5、个位 8", sample: "后三位开出 358。" };
  if (menu.includes("组选") || menu.includes("组三") || menu.includes("组六")) return { title: menu, text: "所选号码组成指定范围的开奖号码，通常不限顺序；组三含一组重复号，组六为三个不同号码。", bet: "选择 1、2、3", sample: "开出 312，按组六口径中奖。" };
  if (menu.includes("不定位")) return { title: menu, text: "所选号码在指定范围的开奖号码中出现即可，不限定具体位置；多码玩法需满足相应出现数量。", bet: "选择 2、7", sample: "指定范围内同时出现 2 和 7。" };
  if (menu.includes("大小单双")) return { title: menu, text: "按指定位置或组合结果判断大、小、单、双；边界与计算口径以后台玩法配置为准。", bet: "选择 大、单", sample: "结果同时满足大与单。" };
  return { title: menu, text: "按当前玩法所定义的号码形态与指定位置进行匹配，满足条件即中奖。", bet: "选择符合玩法的号码", sample: "开奖号码与所选形态一致。" };
}

function rowsFor(game: Game, menu: string): Row[] {
  if (isDigitGame(game)) {
    if (game === "fc3d" && menu === "三星炸金花") return ["前三","中三","后三"].map(title=>({title,choices:["豹子","顺子","对子","杂六","半顺"].map(label=>({label,note:standardOptionOdds(game,menu,label)}))}));
    if (game === "fc3d" && menu === "牛牛") return [{title:"牛牛",choices:["牛大","牛小","牛单","牛双","无牛","牛一","牛二","牛三","牛四","牛五","牛六","牛七","牛八","牛九","牛牛"].map(label=>({label,note:standardOptionOdds(game,menu,label)}))}];
    if (menu === "定位胆") return (game === "fc3d" ? ["百位", "十位", "个位"] : ["万位", "千位", "百位", "十位", "个位"]).map((title) => ({ title, choices: digits, helpers: true }));
    if (menu === "组合大小单双") return [{ title: "五星和值组合", choices: ["大单","小单","大双","小双"].map(label => ({label})) }];
    if (menu.includes("大小单双")) return positionsFor(menu).map(title => ({ title, choices: ["大", "小", "单", "双"].map(label => ({label})) }));
    if (menu.includes("特殊号")) return [{title:"特殊号码",choices:["豹子","对子","顺子"].map(label=>({label}))}];
    if (menu === "梭哈") return [{title:"梭哈",choices:["四条","葫芦","顺子","三条","两对","单牌","一对"].map(label=>({label,note:standardOptionOdds(game,menu,label)}))}];
    if (menu.includes("通选")) return menu.includes("单式") ? [{ title: "单式录入", choices: [{ label: "点击输入号码", note: "每注号码以空格分隔" }] }] : digitPositions(game,menu).map((title) => ({ title, choices: digits, helpers: true }));
    if (menu.includes("混合通选")) return [{title:"通选",choices:["组三通选","组六通选"].map(label=>({label,note:standardOptionOdds(game,menu,label)}))}];
    if (menu.includes("和值") || menu.includes("跨度")) {
      const two = menu.startsWith("前二") || menu.startsWith("后二");
      const short = menu.includes("跨度") || menu.includes("尾数");
      const group = menu.includes("组选");
      const start = group && !short ? 1 : 0;
      const end = short ? 9 : group ? (two ? 17 : 26) : (two ? 18 : 27);
      const showOptionOdds = /^(前|中|后)三组选和值B面$/.test(menu);
      return [{title:menu.includes("跨度")?"跨度":menu.includes("尾数")?"和值尾数":"和值",choices:Array.from({length:end-start+1},(_,i)=>{const label=String(i+start);const note=showOptionOdds?standardOptionOdds(game,menu,label):"";return {label,...(note?{note}:{})}}),helpers:true}];
    }
    if (menu.includes("单式") || menu.includes("混合")) return [{ title: "单式录入", choices: [{ label: "点击输入号码", note: "每注号码以空格分隔" }] }];
    if (menu.includes("直选")) {
      const positions = digitPositions(game,menu);
      return positions.map((title) => ({ title, choices: digits, helpers: true }));
    }
    if (menu.includes("组") || menu.includes("不定位") || menu.includes("不定胆")) {
      const showPackageOdds = /^(前|中|后)三组选包胆B面$/.test(menu);
      const choices = showPackageOdds ? digits.map(choice => ({...choice,note:standardOptionOdds(game,menu,choice.label)})) : digits;
      return [{ title: menu, choices, helpers: !menu.includes("包胆"), hint: menu.includes("包胆") ? "每期仅可选择 1 个包胆号码" : menu.includes("二码") ? "至少选择 2 个号码" : "选择符合条件的号码" }];
    }
    if (["一帆风顺","好事成双","三星报喜","四季发财"].includes(menu)) return [{ title: menu, choices: digits, helpers: true, hint: "选择一个号码，开奖号码中出现指定次数即中奖" }];
    return (game === "fc3d" ? ["百十", "百个", "十个"] : ["万千", "万百", "万十", "万个", "千百", "千十", "千个", "百十", "百个", "十个"]).map((title) => ({
      title,
      choices: ["龙", "虎", "和"].map(label => ({ label, note: standardOptionOdds(game, menu, label) })),
    }));
  }
  if (menu === "和值") return [
    { title: "和值", choices: Array.from({ length: 16 }, (_, i) => { const label=String(i+3); return {label,note:`赔率 ${standardOptionOdds(game,menu,label)}`}; }) },
    { title: "和值组合", choices: ["大单","小单","大双","小双"].map(label=>({label,note:`赔率 ${standardOptionOdds(game,menu,label)}`})) },
    { title: "和值大小单双", choices: ["大","小","单","双"].map(label=>({label,note:`赔率 ${standardOptionOdds(game,menu,label)}`})) },
  ];
  if (menu === "和值大小单双") return [
    { title: "和值组合", choices: ["大单","小单","大双","小双"].map(label=>({label,note:`赔率 ${standardOptionOdds(game,menu,label)}`})) },
    { title: "和值大小单双", choices: ["大","小","单","双"].map(label=>({label,note:`赔率 ${standardOptionOdds(game,menu,label)}`})) },
  ];
  if (menu === "三同号") return [
    { title: "单选", choices: Array.from({length:6},(_,i)=>{const label=`${i+1}${i+1}${i+1}`;return {label,note:`赔率 ${standardOptionOdds(game,menu,label)}`};}) },
    { title: "通选", choices: [{label:"三同号通选",note:`赔率 ${standardOptionOdds(game,menu,"三同号通选")}`} ] },
  ];
  if (menu === "二同号") return [
    { title: "同号", choices: Array.from({length:6},(_,i)=>({label:`${i+1}${i+1}`})) },
    { title: "不同号", choices: Array.from({length:6},(_,i)=>({label:String(i+1)})) },
    { title: "复选", choices: Array.from({length:6},(_,i)=>({label:`${i+1}${i+1}*`})) },
  ];
  if (menu === "三不同号") return [{ title: "选择三个不同点数", choices: dice.map((d, i) => ({ label: d, note: String(i + 1) })), hint: "至少选择 3 个号码" }];
  if (menu === "二不同号") return [{ title: "选择两个不同点数", choices: dice.map((d, i) => ({ label: d, note: String(i + 1) })), hint: "至少选择 2 个号码" }];
  if (menu.startsWith("三连号")) return [{ title: menu, choices: menu.endsWith("通选") ? [{ label: "三连号通选" }] : [{ label: "⚀⚁⚂" }, { label: "⚁⚂⚃" }, { label: "⚂⚃⚄" }, { label: "⚃⚄⚅" }] }];
  if (menu.includes("胆拖")) return [{ title: "胆码", choices: dice.map((d, i) => ({ label: d, note: String(i + 1) })) }, { title: "拖码", choices: dice.map((d, i) => ({ label: d, note: String(i + 1) })) }];
  if (menu.startsWith("任选一")) return [{ title: menu, choices: dice.map((d,i)=>({label:d,note:`点数 ${i+1}`})) }];
  return [{ title: menu, choices: dice.map((d, i) => ({ label: d, note: `点数 ${i + 1}` })), hint: "开奖号码包含所选点数即中奖" }];
}

function doubleRows(game: Game): Row[] {
  if (isDigitGame(game)) return [
    { title: "总和", choices: ["总和大", "总和小", "总和单", "总和双", "龙", "虎", "和"].map((label) => ({ label, note: label === "和" ? "9.80" : "1.98" })) },
    { title: "第一球", choices: ["大", "小", "单", "双"].map((label) => ({ label, note: "1.98" })) },
  ];
  return [{ title: "两面", choices: ["大", "小", "单", "双"].map((label) => ({ label, note: "1.96" })) }];
}

const adminModules = [
  ["彩种分类", "增加双面盘/标准盘切换；标准盘玩法支持分组、启停、推荐排序与前端快捷位配置。"],
  ["赔率设置", "增加“盘口”筛选，切换后只展示对应盘口玩法、奖项、最高赔率、降赔比例与当前赔率。"],
  ["玩法下注限额", "增加“盘口”筛选，按玩法维护单注、用户当期、玩法当期、最多选号/注数及启停状态。"],
  ["注单管理", "玩法筛选采用 全部 → 双面盘/标准盘 → 具体玩法三级口径，列表增加“盘口”列。"],
  ["追号报表", "沿用注单管理筛选口径，展示追号期数、完成状态、盘口和具体玩法。"],
];

const seedRows = fc3dGroups.flatMap(group => group.items.map(name => ({game:"fc3d" as const, group:group.title, name, ...helpFor("fc3d",name)})));

function AdminRequirements({ tab }: { tab: AdminTab }) {
  const [seedGame] = useState<"fc3d">("fc3d");
  const pageLabel = tab === "central" ? "中控后台" : tab === "merchant" ? "商户后台" : "初始化数据";
  return <section className="admin-requirements">
    <header className="admin-head"><div><small>福彩3D标准盘设计 / {pageLabel}</small><h1>福彩3D标准盘{pageLabel}设计需求</h1></div></header>
    <div className="admin-body">
      {tab !== "seed" && <>
        <section className="admin-summary"><div><b>{tab === "central" ? "中控后台设计需求" : "商户后台设计需求"}</b><p>{tab === "central" ? "将后台中游戏开关、玩法结构、赔率、限额及跨商户基础配置等功能中加入标准盘玩法。" : "将商户后台中游戏开关、玩法结构、赔率、限额及注单查询等功能中加入标准盘玩法。"}</p></div></section>
        <section className="admin-card"><h2>核心改造清单</h2><table><thead><tr><th>模块</th><th>标准盘改造</th></tr></thead><tbody>{adminModules.map(([name,desc]) => <tr key={name}><td>{name}</td><td>{desc}</td></tr>)}</tbody></table></section>
        <div className="admin-grid">
          <section className="admin-card"><h2>标准盘开关</h2><div className="toggle-row"><span><b>双面盘</b><small>系统固定开启，不可关闭</small></span><i className="switch on" /></div><div className="toggle-row"><span><b>标准盘</b><small>关闭时隐藏客户端入口；开启后显示玩法与快捷标签</small></span><i className="switch on" /></div><p className="admin-note">福彩3D独立配置；商户关闭时只影响本商户前端，不能突破总后台关闭状态。</p></section>
          <section className="admin-card"><h2>玩法分级与排序</h2><ol><li>一级：玩法组，例如“三星”“前二”。</li><li>二级：具体玩法，例如“三星直选复式”“前二组选复式”。</li><li>推荐排序数值越小越靠前，客户端默认展示最近使用项，其次读取推荐前 4 项。</li><li>玩法编码全局唯一，启停、赔率、限额均以编码关联。</li></ol></section>
        </div>
        <section className="admin-card"><h2>订单筛选与列表字段</h2><div className="filter-flow"><span>福彩3D</span><b>›</b><span>标准盘</span><b>›</b><span>玩法组</span><b>›</b><span>具体玩法</span></div><table><thead><tr><th>订单号</th><th>彩种</th><th>盘口</th><th>玩法</th><th>下注内容</th><th>金额</th><th>状态</th></tr></thead><tbody><tr><td>DD202610060001</td><td>福彩3D</td><td>标准盘</td><td>三星直选复式</td><td>百3 十5 个8</td><td>100.00</td><td>待开奖</td></tr><tr><td>DD202610060002</td><td>福彩3D</td><td>标准盘</td><td>三星组选六复式</td><td>1,2,3</td><td>20.00</td><td>已结算</td></tr></tbody></table></section>
      </>}
      {tab === "seed" && <>
        <section className="admin-summary"><div><b>初始化数据</b><p>福彩3D标准盘玩法作为可重复执行的种子数据，供开发、测试与后台配置初始化。</p></div><div className="seed-filter"><button className="active">福彩3D</button></div></section>
        <SeedTable rows={seedRows} game={seedGame} />
      </>}
    </div>
  </section>;
}

export default function Home() {
  const [game, setGame] = useState<Game>("fc3d");
  const [panel, setPanel] = useState<Panel>("standard");
  const [menu, setMenu] = useState("三星直选复式");
  const [drawer, setDrawer] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [singleInput, setSingleInput] = useState("");
  const [seconds, setSeconds] = useState(40);
  const [specTab, setSpecTab] = useState<SpecTab>("design");
  const [surface, setSurface] = useState<Surface>("client");
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [playHelpOpen, setPlayHelpOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [clientPage, setClientPage] = useState<"betting" | "result" | "orders">("betting");
  const [betSuccessOpen, setBetSuccessOpen] = useState(false);
  const [lastBet, setLastBet] = useState<{ picks: string[]; notes: number; amount: number; currency: "CNY" | "USDT"; menu: string } | null>(null);
  const [currency, setCurrency] = useState<"CNY" | "USDT">("CNY");
  const [unitAmount, setUnitAmount] = useState(1);
  const [unitMenuOpen, setUnitMenuOpen] = useState(false);
  const [betMultiplier, setBetMultiplier] = useState(20);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [presetOpen, setPresetOpen] = useState(false);
  const [presetMultipliers, setPresetMultipliers] = useState([5, 10, 20, 50]);
  const [chaseOpen, setChaseOpen] = useState(false);
  const [chasePeriods, setChasePeriods] = useState(10);
  const [chaseMultiplier, setChaseMultiplier] = useState(1);
  const [chaseInterval, setChaseInterval] = useState(1);
  const [chaseIncrease, setChaseIncrease] = useState(1);
  const [stopOnWin, setStopOnWin] = useState(true);
  const [chaseDetailOpen, setChaseDetailOpen] = useState(true);
  const phoneRef = useRef<HTMLElement>(null);
  const menus = game === "ssc" ? sscMenus : game === "fc3d" ? fc3dMenus : k3Menus;
  const groups = game === "ssc" ? sscGroups : game === "fc3d" ? fc3dGroups : k3Groups;
  const visibleMenus = [menu, ...menus.filter((item) => item !== menu)].slice(0, 4);
  const rows = useMemo(() => panel === "standard" ? rowsFor(game, menu) : doubleRows(game), [game, menu, panel]);
  const playHelp = helpFor(game, panel === "standard" ? menu : "双面盘");
  const betCount = betCountForSelections(menu, selected);
  const hasValidBet = betCount > 0;
  const totalAmount = betCount * unitAmount * betMultiplier;
  const currentOdds = panel === "standard" ? displayOdds(game, menu) : "1.98";
  const maximumPayout = maximumPayoutMultiplier(game, panel, menu, selected, currentOdds);
  const chaseUnitAmount = Math.max(betCount, 1) * unitAmount;
  const unitOptions = currency === "CNY"
    ? [{ value: 1, label: "1元" }, { value: 0.1, label: "1角" }, { value: 0.01, label: "1分" }]
    : [{ value: 1, label: "1 USDT" }, { value: 0.1, label: "0.1 USDT" }, { value: 0.01, label: "0.01 USDT" }];
  const chaseRows = Array.from({ length: chasePeriods }, (_, index) => {
    const step = Math.floor(index / Math.max(chaseInterval, 1));
    const multiplier = chaseMultiplier + step * chaseIncrease;
    return { period: index + 1, issue: 20261006001 + index, multiplier, amount: chaseUnitAmount * multiplier };
  });
  const chaseTotal = chaseRows.reduce((sum, row) => sum + row.amount, 0);
  const openChase = () => {
    if (!hasValidBet) return;
    setCartOpen(false);
    setChaseOpen(true);
  };
  const submitBet = () => {
    if (!hasValidBet) return;
    setLastBet({ picks: [...selected], notes: betCount, amount: totalAmount, currency, menu });
    setConfirmOpen(false);
    setBetSuccessOpen(true);
    window.setTimeout(() => {
      setBetSuccessOpen(false);
      setClientPage("result");
      setSelected([]);
    }, 900);
  };

  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((v) => v <= 0 ? 59 : v - 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const overlayOpen = drawer || quickMenuOpen || playHelpOpen || cartOpen || currencyOpen || presetOpen || chaseOpen || confirmOpen;
  useEffect(() => {
    const phone = phoneRef.current;
    if (!phone) return;
    const syncOverlayViewport = () => {
      const rect = phone.getBoundingClientRect();
      phone.style.setProperty("--phone-overlay-top", `${rect.top}px`);
      phone.style.setProperty("--phone-overlay-left", `${rect.left}px`);
      phone.style.setProperty("--phone-overlay-width", `${rect.width}px`);
      // The bet slip is fixed to the browser viewport bottom, so bottom sheets
      // must use the same coordinate system instead of stopping at the phone
      // mockup's padded bottom edge.
      phone.style.setProperty("--phone-overlay-height", `${window.innerHeight - rect.top}px`);
      const tabsBottom = phone.querySelector<HTMLElement>(".db-tabs")?.getBoundingClientRect().bottom ?? rect.top;
      phone.style.setProperty("--phone-content-top", `${tabsBottom}px`);
      phone.style.setProperty("--phone-content-height", `${window.innerHeight - tabsBottom}px`);
    };
    syncOverlayViewport();
    if (overlayOpen) phone.scrollTo({ top: 0 });
    window.addEventListener("resize", syncOverlayViewport);
    return () => window.removeEventListener("resize", syncOverlayViewport);
  }, [overlayOpen]);

  function changeGame(next: Game) {
    setGame(next); setMenu(next === "ssc" ? "定位胆" : next === "fc3d" ? "三星直选复式" : "和值"); setSelected([]); setSingleInput(""); setDrawer(false); setActiveGroup(null);
  }
  function chooseMenu(next: string) {
    setMenu(next); setPanel("standard"); setSelected([]); setSingleInput(""); setDrawer(false); setActiveGroup(null);
  }
  function updateSingleInput(value: string) {
    setSingleInput(value);
    setSelected(parseSingleEntries(menu, value).map(entry => `单式录入-${entry}`));
  }
  function toggle(key: string) {
    setSelected((list) => toggleSelection(menu, list, key));
  }
  function quick(row: string, action: string) {
    const values = quickSelectionValues(rows.find(item => item.title === row)?.choices.map(choice => choice.label) ?? [], action);
    setSelected((list) => [...list.filter((key) => !key.startsWith(row + "-")), ...values.map((v) => `${row}-${v}`)]);
  }

  return (
    <main className="db-stage">
      <aside className="prototype-nav">
        <small>导航</small><h2>福彩3D<br/>标准盘设计</h2>
        <button className={surface === "client" ? "active" : ""} onClick={() => setSurface("client")}><b>客户端</b><span>{surface === "client" ? "当前页" : "移动端原型"}</span></button>
        <button className={surface === "central" ? "active" : ""} onClick={() => setSurface("central")}><b>中控后台</b><span>设计需求</span></button>
        <button className={surface === "merchant" ? "active" : ""} onClick={() => setSurface("merchant")}><b>商户后台</b><span>设计需求</span></button>
        <button className={surface === "seed" ? "active" : ""} onClick={() => setSurface("seed")}><b>初始化数据</b><span>玩法种子数据</span></button>
      </aside>
      {surface === "client" ? <>
      <section ref={phoneRef} className={`db-phone ${chaseOpen ? "overlay-locked" : ""}`}>
        <header className="db-top">
          <div className="status">
            <b>9:41</b>
            <span className="dynamic-island" aria-hidden="true" />
            <div className="status-icons" aria-label="手机状态">
              <span className="signal"><i /><i /><i /><i /></span>
              <span className="battery"><i /></span>
            </div>
          </div>
          <div className="lottery-nav">
            <button className="back">‹</button>
            <button className="current lottery-picker" onClick={() => setQuickMenuOpen(true)}>福彩3D<span aria-hidden="true" /></button>
            <button className="hamburger">☰</button>
          </div>
        </header>

        <section className="draw-panel">
          <div><small>No <b>308</b></small>
            <div className={`draw-numbers ${game}`}>{(game === "fc3d" ? ["2","4","4"] : game === "ssc" ? ["2","4","4","8","2"] : ["⚀","⚅","⚀"]).map((n, i) => <i key={i}>{n}</i>)}</div>
            <p>{game === "fc3d" ? "10 小 双 组3" : game === "ssc" ? "20 小 双 和" : "8 小 双"}</p>
          </div>
          <div className="next-draw"><small>No <b>309</b></small><strong>{`00:00:${String(seconds).padStart(2, "0")}`}</strong></div>
        </section>

        <nav className="db-tabs">
          <button className={clientPage === "betting" && panel === "double" ? "active" : ""} onClick={() => { setClientPage("betting"); setPanel("double"); setSelected([]); }}>双面盘</button>
          <button className={clientPage === "betting" && panel === "standard" ? "active" : ""} onClick={() => { setClientPage("betting"); setPanel("standard"); setSelected([]); }}>标准盘</button>
          <button>路子图</button><button className={clientPage === "orders" ? "active" : ""} onClick={() => setClientPage("orders")}>今日注单</button><button>聊天室</button>
        </nav>

        {panel === "standard" && <nav className="sub-play-tabs">
          {visibleMenus.map((item) => <button className={menu === item ? "active" : ""} key={item} onClick={() => chooseMenu(item)}>{item}</button>)}
          <button className="all-plays" onClick={() => { setDrawer(true); setActiveGroup(null); }}>▦</button>
        </nav>}

        <section className="db-content">
          <div className="odds-line"><b>赔率：</b><strong>{panel === "standard" ? displayOdds(game, menu) : "1.98"}</strong><button aria-label="查看玩法说明" onClick={() => setPlayHelpOpen(true)}>ⓘ</button></div>
          {menu.includes("单式") ? <section className="single-entry">
            <p>注：每注号码用空格[ ]、逗号[,]或者分号[;]隔开</p>
            <textarea aria-label={`${menu}号码输入`} inputMode="numeric" value={singleInput} onChange={event => updateSingleInput(event.target.value)} placeholder="请输入投注号码" />
          </section> : rows.map((row) => <section className="db-row" key={row.title}>
            <div className="row-title"><div><h2>{row.title}</h2>{row.hint && <p>{row.hint}</p>}</div>{row.helpers && <div>{["全","大","小","单","双","清"].map((a) => <button key={a} onClick={() => quick(row.title, a)}>{a}</button>)}</div>}</div>
            <div className={`db-grid ${row.choices.length > 8 ? "ten" : ""}`}>
              {row.choices.map((choice) => {
                const key = `${row.title}-${choice.label}`;
                return <button className={selected.includes(key) ? "selected" : ""} key={key} onClick={() => toggle(key)}><b>{choice.label}</b>{choice.note && <span>{choice.note}</span>}</button>;
              })}
            </div>
          </section>)}
        </section>

        <footer className={`db-slip ${chaseOpen ? "under-chase" : ""}`}>
          {hasValidBet && <div className="toast">选择 {betCount} 注，共计 {currency} {totalAmount.toFixed(2)}{maximumPayout !== null && <>，最多中奖 {currency} {displayPayoutAmount(unitAmount * betMultiplier * maximumPayout)}</>}</div>}
          <div className="slip-top"><button onClick={() => { setSelected([]); setSingleInput(""); }}>▣ 清空</button><button disabled={!hasValidBet} onClick={() => hasValidBet && setCartOpen(true)}>🛒 购彩篮 {betCount > 0 && <i>{betCount}</i>}</button><button className="slip-balance" onClick={() => setCurrencyOpen(true)}>{currency} {currency === "CNY" ? "￥1283.52" : "11284.99"} ＋</button></div>
          <div className="quick-money"><button onClick={() => setPresetOpen(true)}>✎ 编辑</button>{presetMultipliers.map((value, index) => <button className={value === betMultiplier ? "active" : ""} key={`${index}-${value}`} onClick={() => setBetMultiplier(value)}>{value}</button>)}<button onClick={() => setBetMultiplier((value) => value * 2)}>×2</button></div>
          <div className="place-bet"><div className="unit-select"><button aria-label="选择每注金额" aria-expanded={unitMenuOpen} onClick={() => setUnitMenuOpen(!unitMenuOpen)}>每注 {unitOptions.find((option) => option.value === unitAmount)?.label}<i>{unitMenuOpen ? "▲" : "▼"}</i></button>{unitMenuOpen && <div className="unit-menu">{unitOptions.map((option) => <button className={unitAmount === option.value ? "active" : ""} key={option.value} onClick={() => { setUnitAmount(option.value); setUnitMenuOpen(false); }}>{option.label}</button>)}</div>}</div><input aria-label="投注倍数" inputMode="numeric" value={betMultiplier} onChange={(event) => setBetMultiplier(Math.max(1, Number.parseInt(event.target.value, 10) || 1))} /><span>倍</span><button className="chase" disabled={!hasValidBet} onClick={openChase}>追号</button><button className="bet" disabled={!hasValidBet} onClick={() => setConfirmOpen(true)}>投注</button></div>
        </footer>

        {drawer && <div className="drawer-mask" onClick={() => { setDrawer(false); setActiveGroup(null); }}>
          <aside className="play-drawer" onClick={(e) => e.stopPropagation()}>
            <header><span /><b>全部玩法</b><button onClick={() => { setDrawer(false); setActiveGroup(null); }}>×</button></header>
            <div className="cascade-drawer">
              <div className="child-pane">{activeGroup ? <><p>{activeGroup} · 请选择具体玩法</p><div>{groups.find((group) => group.title === activeGroup)?.items.map((item) => <button className={menu === item ? "active" : ""} onClick={() => chooseMenu(item)} key={item}>{item}</button>)}</div></> : <div className="choose-parent"><b>先选择一级玩法</b><span>右侧为父级玩法，点击后在这里显示对应子玩法。</span></div>}</div>
              <nav className="parent-rail"><div>全部玩法 <b>▦</b></div>{groups.map((group) => <button className={activeGroup === group.title ? "active" : ""} key={group.title} onClick={() => setActiveGroup(group.title)}>{group.title}</button>)}</nav>
            </div>
          </aside>
        </div>}

        {quickMenuOpen && <div className="modal-mask" onClick={() => setQuickMenuOpen(false)}><section className="quick-menu-modal" onClick={(e) => e.stopPropagation()}><header><div><b>快捷菜单</b><small>智能精选</small></div><button onClick={() => setQuickMenuOpen(false)}>×</button></header>{["福彩3D","时时彩","快三"].map((group) => <div className="quick-game-group" key={group}><h3>{group}</h3><div>{quickGames.filter((item) => item.group === group).map((item) => <button key={item.name} onClick={() => { changeGame(item.game!); setQuickMenuOpen(false); }}><i style={{ background: item.color }}>{item.icon}</i><span>{item.name}</span></button>)}</div></div>)}</section></div>}

        {playHelpOpen && <div className="modal-mask help-mask" onClick={() => setPlayHelpOpen(false)}><section className="play-help" onClick={(e) => e.stopPropagation()}><header><b>玩法说明</b><button onClick={() => setPlayHelpOpen(false)}>×</button></header><p>{playHelp.text}</p><h3>投注示例</h3><p className="example">{playHelp.bet}</p><h3>示例号码</h3><p className="example">{playHelp.sample}</p></section></div>}

        {cartOpen && <div className="modal-mask sheet-mask" onClick={() => setCartOpen(false)}><section className="cart-sheet" onClick={(e) => e.stopPropagation()}><header><div><b>购物车</b><button aria-label="收起购物车" onClick={() => setCartOpen(false)}>⌄</button></div><div className="currency-switch"><button onClick={() => setCurrencyOpen(true)}>{currency === "CNY" ? "🇨🇳" : "₮"} {currency} {currency === "CNY" ? "¥17584555.50" : "11284.99"}⌄</button><button className="trash" onClick={() => { setSelected([]); setSingleInput(""); setCartOpen(false); }}>▣</button></div></header><div className="cart-content">{selected.length ? <article className="cart-ticket"><div><span>{menu}</span><button onClick={() => { setSelected([]); setSingleInput(""); setCartOpen(false); }}>⊖</button></div><p>{selected.map((item) => item.split("-").slice(1).join("-")).join(", ")}</p><strong>@{panel === "standard" ? displayOdds(game,menu) : "1.98"}</strong><div className="cart-multiple"><span>每注 {unitOptions.find((option) => option.value === unitAmount)?.label}</span><span>倍数　<b>{betMultiplier}</b></span></div></article> : <div className="empty-cart">购物车暂无注单，请先选择投注项</div>}</div><footer><div><button className="chase" onClick={openChase}>追号</button><button className="bet" disabled={!selected.length} onClick={() => { setCartOpen(false); setConfirmOpen(true); }}>投注</button></div><p>总计 <b>{currency} {totalAmount.toFixed(2)}</b>　注数 <b>{betCount}</b></p></footer></section></div>}

        {currencyOpen && <div className="modal-mask currency-mask" onClick={() => setCurrencyOpen(false)}><section className="currency-sheet" onClick={(e) => e.stopPropagation()}><header><b>请选择货币</b><button onClick={() => setCurrencyOpen(false)}>×</button></header><button className={currency === "CNY" ? "active" : ""} onClick={() => { setCurrency("CNY"); setCurrencyOpen(false); }}><span><i>¥</i>CNY</span><strong>17584555.50</strong></button><button className={currency === "USDT" ? "active" : ""} onClick={() => { setCurrency("USDT"); setCurrencyOpen(false); }}><span><i>₮</i>USDT</span><strong>11284.99</strong></button></section></div>}

        {presetOpen && <div className="modal-mask preset-mask" onClick={() => setPresetOpen(false)}><section className="preset-sheet" onClick={(event) => event.stopPropagation()}><header><b>编辑预设倍数</b><button onClick={() => setPresetOpen(false)}>×</button></header><div>{presetMultipliers.map((value, index) => <label key={index}><span>预设倍数 {index + 1}</span><input aria-label={`预设倍数 ${index + 1}`} inputMode="numeric" value={value} onChange={(event) => setPresetMultipliers((items) => items.map((item, itemIndex) => itemIndex === index ? Math.max(1, Number.parseInt(event.target.value, 10) || 1) : item))} /></label>)}</div><button className="preset-return" onClick={() => setPresetOpen(false)}>返回</button></section></div>}

        {chaseOpen && <div className="modal-mask sheet-mask chase-mask" onClick={() => setChaseOpen(false)}><section className="chase-sheet" onClick={(e) => e.stopPropagation()}><header><button aria-label="收起追号" onClick={() => setChaseOpen(false)}>⌄</button><b>追号</b><span /></header><div className="chase-scroll"><section className="chase-settings"><div className="setting-row"><label>起始期号</label><div><em>当前期</em><strong>20261006001</strong><span>⌄</span></div></div><div className="setting-row periods"><label>追号期数</label><div><div className="stepper"><button onClick={() => setChasePeriods(Math.max(1, chasePeriods - 1))}>−</button><strong>{chasePeriods}期</strong><button onClick={() => setChasePeriods(Math.min(99, chasePeriods + 1))}>＋</button></div><nav>{[5,10,15,20].map((period) => <button className={chasePeriods === period ? "active" : ""} key={period} onClick={() => setChasePeriods(period)}>{period}期</button>)}</nav></div></div><div className="setting-row"><label>起始倍数</label><div className="stepper"><button onClick={() => setChaseMultiplier(Math.max(1, chaseMultiplier - 1))}>−</button><strong>{chaseMultiplier}倍</strong><button onClick={() => setChaseMultiplier(chaseMultiplier + 1)}>＋</button></div></div><div className="setting-row interval"><label>每隔</label><div className="stepper"><button onClick={() => setChaseInterval(Math.max(1, chaseInterval - 1))}>−</button><strong>{chaseInterval}期</strong><button onClick={() => setChaseInterval(chaseInterval + 1)}>＋</button></div><span>× 倍数</span><div className="stepper"><button onClick={() => setChaseIncrease(Math.max(1, chaseIncrease - 1))}>−</button><strong>{chaseIncrease}倍</strong><button onClick={() => setChaseIncrease(chaseIncrease + 1)}>＋</button></div></div><div className="setting-row"><label>中奖停追</label><div className="radio-options"><button className={stopOnWin ? "active" : ""} onClick={() => setStopOnWin(true)}>是 <i /></button><button className={!stopOnWin ? "active" : ""} onClick={() => setStopOnWin(false)}>否 <i /></button></div></div></section><section className="chase-detail"><button className="detail-toggle" onClick={() => setChaseDetailOpen(!chaseDetailOpen)}>{chaseDetailOpen ? "收起" : "展开"}追号详情 <span>{chaseDetailOpen ? "⌃" : "⌄"}</span></button>{chaseDetailOpen && <><div className="chase-table-head"><span>期数</span><span>期号</span><span>倍数</span><span>投注金额</span></div><div className="chase-table">{chaseRows.map((row) => <div key={row.issue}><span>{row.period}期</span><span>{row.issue}</span><span>{row.multiplier}倍</span><span>{row.amount}</span></div>)}</div></>}</section></div><footer><p>总追 <b>{chasePeriods}</b> 期<br/>总投注　{currency} <b>{chaseTotal}</b></p><button>确认追号</button></footer></section></div>}

        {confirmOpen && <div className="modal-mask sheet-mask" onClick={() => setConfirmOpen(false)}><section className="confirm-sheet" onClick={(e) => e.stopPropagation()}><header><b>确定投注</b><button onClick={() => setConfirmOpen(false)}>×</button></header><div className="confirm-detail"><div><h2>{gameName(game)}</h2><span>No.309</span></div><p>@{selected.map((item) => item.split("-").slice(1).join("-")).join(", ") || "—"}</p><small>{menu}</small><strong>{betCount} 注, 共 {currency} {totalAmount.toFixed(2)}</strong></div><footer><p>合计 {currency} <b>{totalAmount.toFixed(2)}</b><br/>总计 {betCount} 注</p><button disabled={!hasValidBet} onClick={submitBet}>确定</button></footer></section></div>}

        {betSuccessOpen && <div className="bet-success-mask"><section><i>✓</i><b>投注成功</b></section></div>}

        {clientPage === "result" && lastBet && <section className="bet-result-page">
          <header><button onClick={() => setClientPage("betting")}>‹</button><b>投注结果</b><span /></header>
          <div className="result-scroll"><article className="result-ticket"><div className="ticket-holes" /><header><div><h2>{gameName(game)}</h2><span>No.20261006001</span></div><time>2026-10-06 17:08:42</time></header><hr/><strong>{lastBet.picks.map((item) => item.split("-").slice(1).join("-")).join(", ")}</strong><p>{lastBet.menu}　{lastBet.notes} 注</p><p>每注{unitOptions.find((option) => option.value === unitAmount)?.label} 共 {lastBet.currency} {lastBet.amount.toFixed(2)}</p><small>注单编号 DD202610060000803691</small></article></div>
          <footer><p>No.20261006001 <span>共计 {lastBet.notes} 注 {lastBet.currency} <b>{lastBet.amount.toFixed(2)}</b></span></p><div><button onClick={() => setClientPage("orders")}>查看记录</button><button onClick={() => setClientPage("betting")}>继续下注</button></div></footer>
        </section>}

        {clientPage === "orders" && <section className="today-orders-page">
          <nav><button className="active">全部</button><button>未开奖</button><button>已开奖</button></nav>
          <div className="order-list">{lastBet && <article><i>{game === "ssc" ? "时" : game === "fc3d" ? "3D" : "快"}</i><div><h2>{gameName(game)}</h2><small>No. 20261006001</small><p>{lastBet.menu} @{lastBet.picks.map((item) => item.split("-").slice(1).join("-")).join(", ")}</p><strong>{lastBet.currency} {lastBet.amount.toFixed(2)}</strong><time>2026-10-06 17:08:42</time></div><em>等待开奖</em></article>}</div>
          <footer><div><b>{lastBet?.currency ?? currency} {lastBet?.amount.toFixed(2) ?? "0.00"}</b><span>投注金额</span></div><div><b>{lastBet ? 1 : 0}</b><span>有效投注</span></div><div><b>{lastBet?.currency ?? currency} 0.00</b><span>中奖金额</span></div><div><b>{lastBet?.currency ?? currency} 0.00</b><span>盈亏金额</span></div></footer>
        </section>}
      </section>

      <aside className="product-spec" aria-label="彩票客户端开发规格说明">
        <header className="spec-head">
          <div><small>彩票客户端 / 移动端</small><h1>标准盘开发规格说明</h1></div>
        </header>
        <nav className="spec-tabs">
          {([["design","设计说明"],["interaction","交互说明"],["fields","字段解释"],["rules","玩法规则"]] as [SpecTab,string][]).map(([key,label]) => <button key={key} className={specTab === key ? "active" : ""} onClick={() => setSpecTab(key)}>{label}</button>)}
        </nav>
        <div className="spec-body">
          {specTab === "design" && <>
            <section className="spec-card"><h2>设计需求</h2><p>客户端沿用时时彩、快三标准盘已经确认的页面结构与交互，只替换为开云彩票福彩3D的31个标准盘玩法、赔率和对应的三位数选号内容。</p></section>
            <section className="spec-card"><h2>布局与层级</h2><ul><li>玩法展示区独立纵向滚动。</li><li>顶部依次为彩种切换、开奖信息、主功能标签与玩法快捷标签。</li><li>底部投注栏固定在屏幕内，与手机容器同宽。</li><li>橙色仅用于当前态、可投注态和核心数据；灰色用于未选与辅助信息。</li></ul></section>
            <section className="spec-card"><h2>组件状态</h2><div className="state-grid"><span><i className="state-default" />默认</span><span><i className="state-active" />选中</span><span><i className="state-disabled" />禁用</span><span><i className="state-danger" />异常/提醒</span></div></section>
          </>}
          {specTab === "interaction" && <>
            <section className="spec-card"><h2>核心交互</h2><ol><li>点击当前彩种后的三角：弹出“快捷菜单”，点击彩票卡片后切换到对应彩种并重置当前选号。</li><li>点击“双面盘/标准盘”：切换盘口，清空上一盘口的选号，避免投注口径混用。</li><li>点击宫格图标：打开全部玩法；父级玩法固定在右侧，点击父级后在左侧展示对应子玩法。</li><li>点击具体子玩法后关闭菜单、刷新投注区并更新顶部快捷玩法。</li><li>点击奖金/赔率后的信息图标：从底部呼出当前玩法说明、投注示例和示例号码。</li><li>点击投注项：在默认/选中间切换，同步刷新注数、金额、购彩篮角标和投注按钮状态。</li><li>点击“购彩篮”：有注单时呼出连续铺满的购物车底板；无注单时按钮禁用，不呼出底板。</li><li>删除最后一组注单或清空全部注单后，自动关闭购物车底板。</li><li>点击“追号”：有有效注单时从手机底部呼出追号菜单；无注单时按钮禁用。</li><li>追号支持选择起始期号、追号期数、起始倍数、每隔 N 期增加 N 倍及中奖停追；参数变化后实时重算每期金额与总投注。</li><li>追号详情默认展开，可收起；详情表随期数生成连续期号，并固定显示底部汇总与“确认追号”。</li><li>点击购物车币种箭头：二次呼出货币选择底板，可在 CNY 与 USDT 间切换。</li><li>点击“投注”：呼出二次确认底板，核对彩种、期号、玩法、选号、注数与合计金额。</li><li>购彩篮为空时不显示红点；有注单时显示数字角标。</li><li>点击全/大/小/奇/偶：批量选号；“清”仅清除当前行。</li></ol></section>
            <section className="spec-card"><h2>福彩3D特殊交互（测试重点）</h2><ul><li>三星直选复式、前二直选复式、后二直选复式必须按各位置所选号码数相乘计注；缺少任一必要位置时不成注。</li><li>三星组选三复式至少选择2个不同号码，每组号码形成2注；三星组选六复式至少选择3个不同号码，每3个号码形成1注。</li><li>前二、后二组选复式至少选择2个不同号码，每2个号码形成1注；组选包胆每期只能选择1个包胆号码，选择新号码时自动替换旧号码。</li><li>单式和混合组选只有输入位数、号码形态合法时才形成有效注单；重复号码按同一注去重。</li><li>三星通选包含一等奖和二等奖两个奖级；混合组选、组选和值、组选包胆分别按组三和组六奖级展示赔率范围。</li><li>定位胆按百位、十位、个位分别选号；三星一码不定胆和二码不定胆不限位置，二码必须选择至少2个不同号码。</li><li>龙虎和只比较百十、百个、十个三组位置；龙、虎赔率9.80，和赔率2.17，所选位置与形态分别成注。</li><li>全部31个玩法和赔率读取福彩3D独立配置，不复用时时彩或排列3/5目录。</li></ul></section>
            <section className="spec-card"><h2>投注栏规则</h2><ul><li>无有效选号时，“投注”置灰，“追号”可见但不执行。</li><li>默认预设倍数为 5/10/20/50，可在“编辑预设倍数”中修改；点击 ×2 对当前倍数翻倍。</li><li>赔率使用普通标准文字展示；多赔率玩法显示最小值～最大值。</li><li>点击赔率后的信息图标，从底部弹出玩法说明、投注示例和示例号码。</li><li>点击清空后清除当前页选号；购彩篮角标为已入篮注单数。</li></ul></section>
          </>}
          {specTab === "fields" && <>
            <section className="spec-card"><h2>页面字段</h2><table><thead><tr><th>字段</th><th>类型/格式</th><th>说明</th></tr></thead><tbody>
              <tr><td>彩种名称</td><td>String</td><td>固定展示福彩3D与当前盘口名。</td></tr><tr><td>当前期号</td><td>Number/String</td><td>已开奖期次，对应开奖号码。</td></tr><tr><td>下期期号</td><td>Number/String</td><td>正在接受投注的期次。</td></tr><tr><td>倒计时</td><td>HH:MM:SS</td><td>距离封盘的剩余时间，归零后进入封盘态。</td></tr><tr><td>开奖号码</td><td>Array</td><td>百位、十位、个位共3个0–9号码。</td></tr><tr><td>玩法编码</td><td>String</td><td>后台配置的唯一玩法标识，前端不直接展示。</td></tr><tr><td>奖金/赔率</td><td>Decimal</td><td>按开云福彩3D标准盘配置展示；多奖级玩法显示最小值～最大值范围。</td></tr><tr><td>注数</td><td>Integer</td><td>根据玩法算法与当前选号实时计算。</td></tr><tr><td>投注金额</td><td>Decimal</td><td>注数 × 每注金额 × 倍数。</td></tr><tr><td>余额</td><td>Currency</td><td>按当前币种精度展示可用余额。</td></tr><tr><td>追号期数</td><td>Integer / 1–99</td><td>从起始期号起连续生成的追号期数，提供 5/10/15/20 快捷值。</td></tr><tr><td>起始倍数</td><td>Integer ≥ 1</td><td>第一期使用的投注倍数。</td></tr><tr><td>追号递增</td><td>间隔期数 + 增加倍数</td><td>每隔指定期数提升一次倍数，变化后重算明细与总额。</td></tr><tr><td>中奖停追</td><td>Boolean</td><td>开启后任一期中奖即停止执行后续追号计划。</td></tr>
            </tbody></table></section>
          </>}
          {specTab === "rules" && <>
            <RulesCatalog rows={seedRows} />
            <section className="spec-card"><h2>边界与异常</h2><ul><li>封盘、销售暂停、余额不足、赔率变更时禁止直接提交，需给出明确原因。</li><li>投注前若奖金/赔率变更，必须二次确认。</li><li>网络超时不能直接判定投注失败，应根据注单唯一号查询最终状态，防止重复下单。</li></ul></section>
          </>}
        </div>
      </aside>
      </> : <AdminRequirements tab={surface} />}
    </main>
  );
}
