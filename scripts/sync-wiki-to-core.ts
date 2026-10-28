import { PrismaClient } from '../generated/client';
import * as fs from 'fs';
import * as path from 'path';

export interface WikiMilestone {
  stage: string;
  effect: string;
  isKeyNode?: boolean;
}

export interface WikiEntryAttributes {
  slot?: string;
  baseStats?: string[];
  milestones?: WikiMilestone[];
  acquisition?: string;
  synergy?: string;
}

export interface WikiEntryInput {
  slug: string;
  name: string;
  category: 'AGENT' | 'EQUIPMENT' | 'COLLECTIBLE' | 'PET' | 'TECH_PART' | 'MOUNT' | 'MECHANIC';
  subcategory?: string;
  edition?: string;
  rarity: 'SS' | 'SP' | 'S' | 'LEGENDARY' | 'EPIC' | 'COMMON';
  tier?: string;
  icon: string;
  summary: string;
  tags: string[];
  attributes: WikiEntryAttributes;
  relatedArticleSlugs: string[];
  sort: number;
}

export interface ProgressionMatrixInput {
  code: string;
  title: string;
  category: 'EQUIPMENT' | 'PET' | 'TECH_PART' | 'AGENT' | 'COLLECTIBLE';
  summary: string;
  columns: { key: string; label: string; highlight?: boolean }[];
  rows: Record<string, any>[];
  recommendations: { tier: string; target: string; reason: string }[];
  relatedArticleSlug?: string;
  sort: number;
}

export interface HandbookGuideInput {
  id: string;
  chapter: string;
  title: string;
  subtitle: string;
  category: string;
  routeSummary: string;
  keyTakeaways: string[];
  articleSlug: string;
  wikiCategory: string;
  matrixCode: string;
  accentColor: string;
}

function copyDirRecursive(srcDir: string, destDir: string) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      const trimmedName = entry.name.replace(/\s+\./g, '.');
      if (trimmedName !== entry.name) {
        fs.copyFileSync(srcPath, path.join(destDir, trimmedName));
      }
    }
  }
}

// 1-10期史诗收藏品（金藏）专属增强映射（源自 danke-creator/my-articles-md/收藏品）
const EPIC_COLLECTIBLE_META: Record<
  string,
  { target: string; atkBonus: boolean; critType: '暴击率 +5%' | '暴击伤害 +5%' }
> = {
  // 第1期
  黄金餐具: { target: '永恒项链', atkBonus: true, critType: '暴击伤害 +5%' },
  救世主的遗物: { target: '破坏者手甲', atkBonus: true, critType: '暴击伤害 +5%' },
  藏身之所地图: { target: '扭曲腰带', atkBonus: false, critType: '暴击伤害 +5%' },
  古老的医学书籍: { target: '永恒腰带', atkBonus: false, critType: '暴击伤害 +5%' },
  // 第2期
  幸运护身符: { target: '破坏者徽记（破坏项链）', atkBonus: true, critType: '暴击率 +5%' },
  神秘光环: { target: '永恒手套', atkBonus: true, critType: '暴击伤害 +5%' },
  超级电路板: { target: '永恒战衣', atkBonus: false, critType: '暴击伤害 +5%' },
  顶尖科学家的笔记: { target: '永恒战靴', atkBonus: false, critType: '暴击伤害 +5%' },
  // 第3期
  史诗泥板: { target: '亡者之甲', atkBonus: false, critType: '暴击伤害 +5%' },
  洪荒战鼓: { target: '混沌手套', atkBonus: true, critType: '暴击伤害 +5%' },
  仙境玉露: { target: '迷惘之靴', atkBonus: false, critType: '暴击伤害 +5%' },
  烈焰红羽: { target: '分裂之石', atkBonus: true, critType: '暴击伤害 +5%' },
  // 第4期
  核能电池: { target: '破坏之力', atkBonus: true, critType: '暴击伤害 +5%' },
  等离子剑: { target: '双生立场 / 立场发生器', atkBonus: true, critType: '暴击伤害 +5%' },
  黄金号角: { target: '双生板砖 / 重力控制器', atkBonus: false, critType: '暴击伤害 +5%' },
  元素指环: { target: '双生回旋镖 / 回旋镖', atkBonus: true, critType: '暴击伤害 +5%' },
  // 第5期
  水力推动脚蹼: { target: '双生无人机（跨越星际的触手套装核心）', atkBonus: true, critType: '暴击率 +5%' },
  反重力装置: { target: '破坏者束腰', atkBonus: false, critType: '暴击伤害 +5%' },
  超人类药品: { target: '破坏者风衣', atkBonus: false, critType: '暴击伤害 +5%' },
  通讯海螺: { target: '双生立场 / 立场发生器', atkBonus: false, critType: '暴击伤害 +5%' },
  // 第6期
  克莱因瓶: { target: '双生无人机（跨越星际的触手套装核心）', atkBonus: true, critType: '暴击率 +5%' },
  反粒子葫芦: { target: '双生榴莲 / 铁蒺藜', atkBonus: true, critType: '暴击伤害 +5%' },
  微型人造太阳: { target: '双生足球 / 量子偏振器', atkBonus: true, critType: '暴击伤害 +5%' },
  迷你戴森球: { target: '双生雷电 / 雷电发射器', atkBonus: true, critType: '暴击伤害 +5%' },
  // 第7期
  宇宙罗盘: { target: '追光者', atkBonus: true, critType: '暴击伤害 +5%' },
  无限音符: { target: '混乱之剑', atkBonus: true, critType: '暴击伤害 +5%' },
  虫洞探测器: { target: '双生回旋镖 / 回旋镖', atkBonus: true, critType: '暴击伤害 +5%' },
  兽火之炉: { target: '双生钻头 / 哨箭', atkBonus: true, critType: '暴击伤害 +5%' },
  // 第8期
  便捷式机箱: { target: '双生守卫者 / 守卫者', atkBonus: false, critType: '暴击伤害 +5%' },
  星轨乘客卡: { target: '双生激光 / 激光器', atkBonus: false, critType: '暴击伤害 +5%' },
  脑机芯片: { target: '双生无人机 / 毁灭者', atkBonus: true, critType: '暴击伤害 +5%' },
  飞行器胶囊: { target: '双生榴莲 / 铁蒺藜', atkBonus: false, critType: '暴击伤害 +5%' },
  // 第9期
  地之元素之珠: { target: '双生立场 / 土元素', atkBonus: false, critType: '暴击伤害 +5%' },
  水之元素之珠: { target: '双生雷电 / 水元素', atkBonus: false, critType: '暴击伤害 +5%' },
  火之元素之珠: { target: '双生燃烧瓶 / 火元素', atkBonus: true, critType: '暴击伤害 +5%' },
  风之元素之珠: { target: '双生足球 / 风元素', atkBonus: true, critType: '暴击伤害 +5%' },
  // 第10期
  双子座星辉: { target: 'SS武器 双绝枪', atkBonus: true, critType: '暴击伤害 +5%' },
  处女座星辉: { target: 'SS手套 月殇护手', atkBonus: true, critType: '暴击伤害 +5%' },
  巨蟹座星辉: { target: 'SS衣服 天启战衣', atkBonus: false, critType: '暴击伤害 +5%' },
  狮子座星辉: { target: 'SS项链 神罚项链', atkBonus: true, critType: '暴击伤害 +5%' },
};

// 6大必做传奇红收藏与核心套装红藏（源自 6个必做的红收藏品推荐 & 所有加暴击率的金收藏品）
const LEGENDARY_COLLECTIBLE_META: Record<
  string,
  { tier: string; summary: string; setInfo?: string; milestones: WikiMilestone[]; tags: string[] }
> = {
  记忆编辑器: {
    tier: 'T0 必做',
    summary: '「实现童年的梦想」宠物套绝对核心，强化破坏项链与异宠共鸣持续时间，建议优先冲刺红 5 星。',
    setInfo: '实现童年的梦想（记忆编辑器 + 时间回溯齿轮 + 空间回溯齿轮 + 梦境显影液）',
    tags: ['6大必做红藏', '暴击率', '宠物共鸣套', '破坏项链专属'],
    milestones: [
      { stage: '黄3星', effect: '激活套装「实现童年的梦想」：异宠同步率 +10%' },
      { stage: '红3星', effect: '暴击率 +10%，异宠共鸣减伤 +20%', isKeyNode: true },
      { stage: '红5星', effect: '配合其余三件黄5达成25黄星：异宠共鸣持续时间 +1秒（全程无缝共鸣）', isKeyNode: true },
    ],
  },
  暗物质傀儡: {
    tier: 'T0 必做',
    summary: '第9期核心传奇收藏品，大幅增幅SS星辰束腰与护盾增伤体系，必做6大传奇单品之一。',
    tags: ['6大必做红藏', '暴击率', '星辰束腰强化'],
    milestones: [
      { stage: '黄3星', effect: '解锁星辰束腰能量上限与护盾伤害加成' },
      { stage: '红3星', effect: '暴击率 +10%，核心词条大幅跃升', isKeyNode: true },
    ],
  },
  水瓶座星辉: {
    tier: 'T0 必做',
    summary: '第10期「宇宙群星闪耀时」SS武器套核心，专项强化双生钻头伤害与混沌之风护盾增伤。',
    setInfo: '宇宙群星闪耀时（水瓶座星辉 + 双鱼座星辉 + 白羊座星辉 + 金牛座星辉）',
    tags: ['6大必做红藏', 'SS武器套', '双生钻头强化', '暴击率'],
    milestones: [
      { stage: '黄3星', effect: '全套各3黄星：护盾状态下混沌之风额外 +13%伤害，护盾增伤 +30%', isKeyNode: true },
      { stage: '红3星', effect: '暴击率 +10%，双生钻头穿透与暴伤大幅提升', isKeyNode: true },
    ],
  },
  双鱼座星辉: {
    tier: 'T0 必做',
    summary: '第10期「宇宙群星闪耀时」SS武器套核心，专项强化双生雷电输出上限。',
    setInfo: '宇宙群星闪耀时（水瓶座星辉 + 双鱼座星辉 + 白羊座星辉 + 金牛座星辉）',
    tags: ['6大必做红藏', 'SS武器套', '双生雷电强化', '暴击率'],
    milestones: [
      { stage: '黄3星', effect: '激活宇宙群星闪耀时套装护盾增伤 +30%', isKeyNode: true },
      { stage: '红3星', effect: '暴击率 +10%，双生雷电高频落雷增伤', isKeyNode: true },
    ],
  },
  金牛座星辉: {
    tier: 'T0 必做',
    summary: '第10期首选传奇藏品，强化版本最强S腰带「扭曲腰带」波动上限，建议在SS武器套中第一个做出黄3星。',
    setInfo: '宇宙群星闪耀时（水瓶座星辉 + 双鱼座星辉 + 白羊座星辉 + 金牛座星辉）',
    tags: ['6大必做红藏', 'SS武器套首选', '扭曲腰带强化', '暴击率'],
    milestones: [
      { stage: '黄3星', effect: '推荐第1顺位做出黄3星，直接拉高扭曲腰带能量波动倍率', isKeyNode: true },
      { stage: '红3星', effect: '暴击率 +10%，终极腰带乘区加成', isKeyNode: true },
    ],
  },
  梦境显影液: {
    tier: 'T0 必做',
    summary: '「实现童年的梦想」宠物套组件，与记忆编辑器搭配凑齐25黄星即可实现异宠共鸣全程覆盖。',
    setInfo: '实现童年的梦想（记忆编辑器 + 时间回溯齿轮 + 空间回溯齿轮 + 梦境显影液）',
    tags: ['6大必做红藏', '宠物共鸣套', '暴击率'],
    milestones: [
      { stage: '黄5星', effect: '配合记忆编辑器红5凑满25星，解锁异宠共鸣持续时间 +1秒', isKeyNode: true },
      { stage: '红3星', effect: '暴击率 +10%', isKeyNode: true },
    ],
  },
  基因编辑器: {
    tier: 'T1 套装核心',
    summary: '经典「冰霜战靴套」组件，全套各3黄星即可获得每层冰霜血脉 +10%护盾增伤与对冰缓目标 +50%伤害。',
    setInfo: '冰霜战靴典藏套（基因编辑器 + 梦境拼图 + 复制宝镜 + 赛博图腾柱）',
    tags: ['冰鞋套', '冰缓增伤', '暴击率'],
    milestones: [
      { stage: '黄3星', effect: '冰霜战靴每层冰霜血脉 +10%护盾增伤，对冰缓目标伤害 +50%', isKeyNode: true },
      { stage: '红3星', effect: '冰霜血脉充能层数上限 +1，暴击率 +10%', isKeyNode: true },
    ],
  },
  星际跃迁矩阵图纸: {
    tier: 'T1 无人机套',
    summary: '「跨越星际的触手」双生无人机套核心，老区玩家最易成型的10黄星/20黄星无人机增伤套装。',
    setInfo: '跨越星际的触手（星际跃迁矩阵图纸 + 超能神经元 + 水力推动脚蹼 + 克莱因瓶）',
    tags: ['无人机套', '双生无人机强化', '暴击率'],
    milestones: [
      { stage: '套装10黄星', effect: '双生无人机导弹数量 +5%，单发伤害 +5%' },
      { stage: '套装20黄星', effect: '双生无人机导弹数量 +10%，单发伤害 +10%', isKeyNode: true },
    ],
  },
  超能神经元: {
    tier: 'T1 无人机套',
    summary: '「跨越星际的触手」双生无人机套核心组件，配合水力推动脚蹼与克莱因瓶大幅提升毁灭者导弹密度。',
    setInfo: '跨越星际的触手',
    tags: ['无人机套', '双生无人机强化', '暴击率'],
    milestones: [
      { stage: '套装20黄星', effect: '双生无人机导弹数量 +10%，单发伤害 +10%', isKeyNode: true },
      { stage: '红3星', effect: '暴击率 +10%', isKeyNode: true },
    ],
  },
  时间回溯齿轮: {
    tier: 'T1 宠物套',
    summary: '「实现童年的梦想」宠物套核心组件，推荐升至黄5星凑齐25星共鸣持续时间+1秒。',
    setInfo: '实现童年的梦想',
    tags: ['宠物共鸣套', '暴击率'],
    milestones: [
      { stage: '黄5星', effect: '凑齐套装25黄星：异宠共鸣持续时间 +1秒', isKeyNode: true },
    ],
  },
  空间回溯齿轮: {
    tier: 'T1 宠物套',
    summary: '「实现童年的梦想」宠物套核心组件，强化混乱腰带与异宠同步率。',
    setInfo: '实现童年的梦想',
    tags: ['宠物共鸣套', '混乱腰带强化', '暴击率'],
    milestones: [
      { stage: '黄5星', effect: '凑齐套装25黄星：异宠共鸣持续时间 +1秒', isKeyNode: true },
    ],
  },
};

export function buildHandbookGuides(): HandbookGuideInput[] {
  return [
    {
      id: 'handbook-agent',
      chapter: '第一篇 · 特工体系',
      title: '从入门到入土 · 特工篇',
      subtitle: '科萌 → 塔洛西娅 → 维托尔 → 543 / 741 / 840 / 伊狑844',
      category: 'AGENT',
      routeSummary: '新手用科萌过渡，攒够120个S碎片换塔洛西娅；红5且面板裂伤150%切维托尔，逐步推进543(54核)→741(112核)→840(141核)→伊狑844(156核)。',
      keyTakeaways: [
        '120 S碎片直接解锁塔洛西娅，觉醒红5 + 150%裂伤前不急切维托尔',
        '543阵容：中位主力红5 + 左凛音红3（全程挂毒）+ 右位红4凑齐协同12星',
        '神火特工遵循「哪吒挂火 > 伏尔甘1红星开局技能+1 > 洛基4红星100%余烬」',
      ],
      articleSlug: 'event-%e4%bb%8e%e5%85%a5%e9%97%a8%e5%88%b0%e5%85%a5%e5%9c%9f-%e7%89%b9%e5%b7%a5%e7%af%87.md',
      wikiCategory: 'AGENT',
      matrixCode: 'agent-tier-and-awakening',
      accentColor: 'from-orange-500 to-amber-500',
    },
    {
      id: 'handbook-equip',
      chapter: '第二篇 · 装备与神炼',
      title: '从入门到入土 · 装备篇',
      subtitle: '传奇亡者之甲 → 五件SS＋破坏项链 → 混沌融合 → 神炼',
      category: 'EQUIPMENT',
      routeSummary: '推关先做红亡者之甲；SS按「双绝枪 → 冰霜战靴 → 星辰束腰 → 天启战衣/月殇护手」打造，前中期带神铸3破坏项链；80核心后按衣服→武器→手套开启神炼。',
      keyTakeaways: [
        'SS合成顺位：No.1双绝枪 → No.2冰霜战靴 → No.3星辰束腰（神罚项链大后期再做）',
        '天启战衣永恒3「受伤先扣血再扣盾」配合破坏项链神铸3实现满盾低血高暴击',
        '神炼需目标装备达永恒4+破坏4，按 6 → 10 → 22 → 30 → 42 神炼核心分五阶段投入',
      ],
      articleSlug: 'resources-%e5%85%a5%e9%97%a8%e5%88%b0%e5%85%a5%e5%9c%9f-%e8%a3%85%e5%a4%87%e7%af%87',
      wikiCategory: 'EQUIPMENT',
      matrixCode: 'ss-equip-synthesis-and-forge',
      accentColor: 'from-blue-500 to-cyan-400',
    },
    {
      id: 'handbook-pet',
      chapter: '第三篇 · 战术宠物',
      title: '从入门到入土 · 宠物篇',
      subtitle: '老鹰过渡 → 4只5黄星解锁S宠 → 幽暗之灵 & 异宠核心节点',
      category: 'PET',
      routeSummary: '早期25万战力用老鹰；将4只同类型普通宠升至5黄星解锁S宠物，首推自动锁头的「幽暗之灵」，出战与助战选同一只共享觉醒红星。',
      keyTakeaways: [
        '解锁S宠物后，4只垫子普通宠必须保留5黄星不可解散，否则S宠物锁死',
        '出战与助战选同名S宠物可共享红星觉醒进度，节省海量资源',
        '助战槽解锁：21核开3槽、50核开4槽、90核开5槽、150核开6槽；T0技能必带共鸣伤害+共鸣增幅',
      ],
      articleSlug: 'resources-%e4%bb%8e%e5%85%a5%e9%97%a8%e5%88%b0%e5%85%a5%e5%9c%9f-%e5%ae%a0%e7%89%a9%e7%af%87',
      wikiCategory: 'PET',
      matrixCode: 'pet-awakening-and-core-nodes',
      accentColor: 'from-emerald-500 to-teal-400',
    },
    {
      id: 'handbook-collectible',
      chapter: '第四篇 · 典藏收藏品',
      title: '从入门到入土 · 收藏品篇',
      subtitle: '红3星暴击/暴伤金收藏盘点 → 6大必做红藏 → 三大毕业套装',
      category: 'COLLECTIBLE',
      routeSummary: '金色收藏品升至红3星解锁+5%暴击率或+5%暴击伤害；传奇收藏品围绕「实现童年的梦想（宠物套）」「跨越星际的触手（无人机套）」「宇宙群星闪耀时（SS武器套）」构建。',
      keyTakeaways: [
        '版本第一神套「实现童年的梦想」凑满25黄星即可让异宠共鸣持续时间+1秒全程不断',
        '6大必做红藏：记忆编辑器、暗物质傀儡、水瓶座星辉、双鱼座星辉、金牛座星辉、梦境显影液',
        '优先将加攻击力面板（升满+2000攻击）且对应主力装备的金收藏升至红3星',
      ],
      articleSlug: 'resources-1-10%e6%9c%9f%e5%8a%a0%e6%9a%b4%e4%bc%a4%e7%9a%84%e9%87%91%e6%94%b6%e8%97%8f',
      wikiCategory: 'COLLECTIBLE',
      matrixCode: 'collectible-crit-and-red-priority',
      accentColor: 'from-amber-500 to-yellow-400',
    },
    {
      id: 'handbook-mount',
      chapter: '第五篇 · 载具与配件',
      title: '从入门到入土 · 载具与配件篇',
      subtitle: '通关80章解锁载具 → 先铺满零件凑横线 → 双生配件谐振过载',
      category: 'MOUNT',
      routeSummary: '载具零件遵循「先铺满格子凑出战横线 → 闲置载具吃同步率属性 → 富余材料升品 → 长期零件再洗练」；配件优先合成双生无人机、双生钻头、双生足球并开启谐振过载。',
      keyTakeaways: [
        '横线特殊效果仅出战载具生效，闲置载具按同步率百分比继承零件面板属性',
        '切忌为了合1个红零件把出战载具拆空导致断横线；全部铺满金后再合成升星',
        '维托尔优先洗「技能伤害 > 首领伤害 > 裂伤」，伊狑优先洗「首领伤害 > 技能伤害」',
      ],
      articleSlug: 'resources-%e4%bb%8e%e5%85%a5%e9%97%a8%e5%88%b0%e5%85%a5%e5%9c%9f-%e8%bd%bd%e5%85%b7%e7%af%87',
      wikiCategory: 'MOUNT',
      matrixCode: 'tech-part-twin-and-overload',
      accentColor: 'from-purple-500 to-pink-500',
    },
  ];
}

export function buildProgressionMatrices(): ProgressionMatrixInput[] {
  return [
    {
      code: 'ss-equip-synthesis-and-forge',
      title: 'SS 神装打造顺位 & 神炼核心五阶段分配矩阵',
      category: 'EQUIPMENT',
      summary:
        '整合《SS装备合成顺序》与《神炼顺序推荐》：前中期优先做齐前5件SS并保留神铸3破坏项链；神器核心约80个后，按「衣服 → 武器 → 手套」顺序开启神炼（需目标装备永恒4+破坏4）。',
      columns: [
        { key: 'stage', label: '培养阶段 / 部位顺位', highlight: true },
        { key: 'armor', label: 'SS天启战衣' },
        { key: 'weapon', label: 'SS双绝枪' },
        { key: 'gloves', label: 'SS月殇护手' },
        { key: 'totalCores', label: '累计神炼核心', highlight: true },
        { key: 'deltaCores', label: '阶段新增核心' },
        { key: 'effect', label: '核心实战收益与机制质变' },
      ],
      rows: [
        {
          stage: '前置：SS合成顺位',
          armor: 'No.4（够永恒3即做）',
          weapon: 'No.1（绝对首选）',
          gloves: 'No.5（卡主线可提至No.3）',
          totalCores: '0 个（神器核心阶段）',
          deltaCores: '—',
          effect: 'No.2 冰霜战靴（叠满+60%伤增）、No.3 星辰束腰；前中期项链用神铸3破坏者徽记',
        },
        {
          stage: '阶段一：三件先到神炼 2 🌟',
          armor: '神炼 2',
          weapon: '神炼 2',
          gloves: '神炼 2',
          totalCores: '6 个',
          deltaCores: '+6 个',
          effect: '衣服优先起步，大幅降低神炼触发门槛（如SS衣服护盾高于血量30%即可触发）',
        },
        {
          stage: '阶段二：武器、手套追到 3',
          armor: '神炼 2',
          weapon: '神炼 3',
          gloves: '神炼 3',
          totalCores: '10 个',
          deltaCores: '+4 个',
          effect: '衣服暂留神炼2，单件从神炼2升3各需2个核心，优先拉高武器与手套输出乘区',
        },
        {
          stage: '阶段三：武器、手套追到 5 🔥',
          armor: '神炼 2',
          weapon: '神炼 5',
          gloves: '神炼 5',
          totalCores: '22 个',
          deltaCores: '+12 个',
          effect: '单件从3升5需6个核心（单件累计10核），双核心输出部位神炼词条全面成型',
        },
        {
          stage: '阶段四：衣服补到 5，三件齐平',
          armor: '神炼 5',
          weapon: '神炼 5',
          gloves: '神炼 5',
          totalCores: '30 个',
          deltaCores: '+8 个',
          effect: '三部位全部达成神炼5（10+10+10=30核），兼顾攻防与护盾增伤上限',
        },
        {
          stage: '阶段五：三件逐步补到 6 👑',
          armor: '神炼 6',
          weapon: '神炼 6',
          gloves: '神炼 6',
          totalCores: '42 个',
          deltaCores: '+12 个',
          effect: '单件从5升6需4个核心（单件累计14核），顶配三部位神炼毕业形态',
        },
      ],
      recommendations: [
        {
          tier: '萌新 / 前中期（0~30 神器核心）',
          target: '红亡者之甲 + 双绝枪 + 冰霜战靴 + 神铸3破坏项链',
          reason: '切忌过早合成SS神罚项链；天启战衣等够永恒3时制作，配合破坏项链压血满盾爆发。',
        },
        {
          tier: '进阶期（约 80 神器核心 + 6~10 神炼核心）',
          target: '衣服/武器/手套达成神炼 2（6核）→ 武器手套神炼 3（10核）',
          reason: '腰带位保留S级扭曲腰带即可，不建议为了神炼强转SS腰带；混沌融合满18/27/36/45星分别解锁斧头/镰刀/双刀/圣剑形态。',
        },
        {
          tier: '后期大成（22~42 神炼核心）',
          target: '22核（武5手5衣2）→ 30核（三件神炼5）→ 42核（三件神炼6）',
          reason: '单件升至神炼2/3/5/6累计分别需 2/4/10/14 个神炼核心，结合伤害计算器动态微调。',
        },
      ],
      relatedArticleSlug: 'resources-%e7%a5%9e%e7%82%bc%e9%a1%ba%e5%ba%8f%e6%8e%a8%e8%8d%90',
      sort: 1,
    },
    {
      code: 'agent-tier-and-awakening',
      title: '特工培养路线（543/741/840/844）& 神火特工觉醒矩阵',
      category: 'AGENT',
      summary:
        '整合《从入门到入土·特工篇》与《神火特工养成与觉醒分配指南》：明确S特工协同红星配置总核心需求，以及哪吒、伏尔甘、洛基铁三角觉醒质变节点。',
      columns: [
        { key: 'node', label: '阵容节点 / 神火阶段', highlight: true },
        { key: 'center', label: '中位（出战主特工）' },
        { key: 'left', label: '左位（挂毒/协同）' },
        { key: 'right', label: '右位（协同辅助）' },
        { key: 'totalCores', label: '特工核心/碎片需求', highlight: true },
        { key: 'notes', label: '连携搭配与实战要点' },
      ],
      rows: [
        {
          node: '开荒过渡期',
          center: '科萌 → 塔洛西娅（120 S碎片解锁）',
          left: '科萌（协同）',
          right: '金（协同）',
          totalCores: '0 ~ 15 个',
          notes: '塔洛西娅觉醒红5且面板裂伤达150%前，不要提前切换维托尔',
        },
        {
          node: '543 丐版（协同12星）',
          center: '塔洛西娅（红5）',
          left: '凛音（红3 · 全程挂毒）',
          right: '科萌（红4）',
          totalCores: '54 个特工核心',
          notes: '达成协同12星让凛音全程不断毒；连携优先带神火/神龟或科萌+凛音',
        },
        {
          node: '543 增强版 🌟',
          center: '维托尔（红5）',
          left: '凛音（红3）',
          right: '塔洛西娅（红4）',
          totalCores: '54 个特工核心',
          notes: '裂伤达标后切维托尔主C，吃满神火与爆发乘区',
        },
        {
          node: '741 节点（开启3连携）🔥',
          center: '维托尔（红7）',
          left: '凛音（红1）',
          right: '塔洛西娅（红4）',
          totalCores: '112 个特工核心',
          notes: '过渡期富余核心可升同调等级；3连携选「神火/龟 + 塔洛西娅 + 凛音/科萌」',
        },
        {
          node: '840 节点（开启4连携）',
          center: '维托尔（红8）',
          left: '凛音（金6 · 不觉醒）',
          right: '塔洛西娅（红4）',
          totalCores: '141 个特工核心',
          notes: '“0”代表凛音不觉醒，注意凛音必须始终放在左边槽位',
        },
        {
          node: '伊狑 844 顶配节点 👑',
          center: '伊狑（红8）',
          left: '维托尔（红4）',
          right: '塔洛西娅（红4）',
          totalCores: '156 个特工核心',
          notes: '回响需用超武燃烧瓶/超武火箭或第1助战位带红5河豚补挂毒；载具补洗Boss增伤',
        },
        {
          node: 'SP 神火铁三角觉醒',
          center: '哪吒（神火引擎基石）',
          left: '伏尔甘（红1/红4 开局技能+1/+2）',
          right: '洛基（红1入门 / 红4必中余烬 / 红6满层）',
          totalCores: 'SP万能碎片 / 活动转盘',
          notes: '优先级：先解锁哪吒挂神火 → 伏尔甘1红星 → 洛基冲击4红星（100%触发30%余烬增伤）',
        },
      ],
      recommendations: [
        {
          tier: '无哪吒玩家（萌新 / 平民）',
          target: '120 S碎片拿塔洛西娅 → 推进 543（54核），SP活动优先补哪吒',
          reason: '无哪吒则无法激活神火环境，伏尔甘与洛基的连携增伤均无法触发，切勿盲目单抽洛基。',
        },
        {
          tier: '有哪吒的中微氪玩家',
          target: '主力成型 543/741 + 伏尔甘觉醒1红星 + 洛基觉醒4红星',
          reason: '伏尔甘1红星开局武器技能+1大幅改善回响手感，洛基4红星将恶意余烬触发率提至100%。',
        },
        {
          tier: '大后期冲榜玩家',
          target: '维托尔 840（141核）或 伊狑 844（156核）+ 洛基6红星',
          reason: '伊狑844可额外召唤第1助战位宠物上场，配合红5河豚挂毒与5层神火余烬拉满上限。',
        },
      ],
      relatedArticleSlug: 'event-%e4%bb%8e%e5%85%a5%e9%97%a8%e5%88%b0%e5%85%a5%e5%9c%9f-%e7%89%b9%e5%b7%a5%e7%af%87.md',
      sort: 2,
    },
    {
      code: 'pet-awakening-and-core-nodes',
      title: 'S 宠物培养 & 异宠核心消耗节点（11~162核）精算表',
      category: 'PET',
      summary:
        '整合《S宠物培养从入门到入土》与《异宠核心消耗节点对照表》：首推自动锁头的「幽暗之灵」，出战与助战选同名S宠共享觉醒星级，按 21/50/90/150 异宠核心节点解锁第3~6助战槽位。',
      columns: [
        { key: 'node', label: '异宠核心节点', highlight: true },
        { key: 'slots', label: '开启助战槽位' },
        { key: 'config', label: '主力与助战推荐配置' },
        { key: 'skills', label: '必带助战技能组合', highlight: true },
        { key: 'benefit', label: '节点质变收益说明' },
      ],
      rows: [
        {
          node: '前置：解锁 S 宠物（0核）',
          slots: '第 1、2 助战槽',
          config: '4只同类型普通宠升至5黄星（期间25万战力用老鹰过渡）',
          skills: '共鸣伤害 + 共鸣增幅',
          benefit: '解锁S宠后4只5黄星普通宠严禁解散；主力首推「幽暗之灵」（永夜王冠自动锁头）',
        },
        {
          node: '节点一：11 ~ 21 异宠核心 🌟',
          slots: '解锁第 3 助战槽（21核）',
          config: '出战与助战位放同一只S宠（如全放幽暗之灵）共享红星',
          skills: '共鸣伤害(T0) + 共鸣增幅(T0) + 守护(T1)',
          benefit: '零氪/微氪第一个黄金质变点，开启第3助战槽并激活三T0/T1核心被动',
        },
        {
          node: '节点二：30 ~ 50 异宠核心 🔥',
          slots: '解锁第 4 助战槽（50核）',
          config: '主力S宠觉醒红3~红5，助战位同步继承高星共鸣率',
          skills: '共鸣伤害 + 共鸣增幅 + 守护 + 百分比攻击(T2)',
          benefit: '第4槽位开启，5红星3只同款S宠即可将助战共鸣概率拉满至 100% 上限',
        },
        {
          node: '节点三：90 异宠核心',
          slots: '解锁第 5 助战槽（90核）',
          config: '幽暗之灵 / 加肥喵 / 松鼠 / 企鹅 高星共鸣阵列',
          skills: '前4槽固定 + 异伤（毒素灌溉 / 乘虚而入 / 寒霜）',
          benefit: '补齐毒/衰/冰异常增伤乘区（伊狑844阵容可在第1助战位放红5河豚上场挂毒）',
        },
        {
          node: '节点四：150 ~ 162 异宠核心 👑',
          slots: '解锁终极第 6 助战槽（150核）',
          config: '全6槽满配觉醒 + 异宠晶石洗练满词条',
          skills: '共鸣伤害 + 共鸣增幅 + 守护 + 百分比攻击 + 双异伤',
          benefit: '宠物系统终极完全体，吃满全部6槽不被稀释的独立共鸣伤害乘区',
        },
      ],
      recommendations: [
        {
          tier: '零氪 / 微氪必达节点',
          target: '21 异宠核心（开第3槽）→ 50 异宠核心（开第4槽）',
          reason: '异宠核心切忌平均乱点，严格卡 21核、50核 槽位解锁线，且出战与助战务必选同一种S宠物共享星级。',
        },
        {
          tier: '助战技能洗练铁律',
          target: 'T0（共鸣伤害、共鸣增幅）> T1（守护）> T2（百分比攻击）> T3（毒/衰/冰异伤）',
          reason: '坚决淘汰生命值百分比、最终生命、共鸣加速等D级无效词条。',
        },
      ],
      relatedArticleSlug: 'resources-%e5%bc%82%e5%ae%a0%e6%a0%b8%e5%bf%83%e6%b6%88%e8%80%97%e8%8a%82%e7%82%b9%e6%8e%a8%e8%8d%90',
      sort: 3,
    },
    {
      code: 'collectible-crit-and-red-priority',
      title: '1~10 期收藏品暴击/暴伤盘点 & 四大必做典藏套装矩阵',
      category: 'COLLECTIBLE',
      summary:
        '整合《所有加暴击率的金收藏品》《1-10期加暴伤的金收藏品全盘点》与《必做6个传奇收藏单品推荐》：金收藏升至红3星解锁5%暴击率或5%暴伤，红收藏优先凑齐宠物套与SS武器套。',
      columns: [
        { key: 'setOrTier', label: '典藏套装 / 期数分类', highlight: true },
        { key: 'coreItems', label: '核心收藏品构成' },
        { key: 'starTarget', label: '推荐星级节点', highlight: true },
        { key: 'coreBonus', label: '核心词条与套装质变效果' },
      ],
      rows: [
        {
          setOrTier: '🏆 实现童年的梦想（版本第一宠物套）',
          coreItems: '记忆编辑器(红) + 时间回溯齿轮(红) + 空间回溯齿轮(红) + 梦境显影液(红)',
          starTarget: '记忆编辑器红5 + 其余三件黄5（共25黄星）',
          coreBonus: '3黄星异宠同步率+10%；25黄星异宠共鸣持续时间+1秒（全程不断档）！同时强化破坏项链与混乱腰带',
        },
        {
          setOrTier: '🌌 宇宙群星闪耀时（SS武器毕业套）',
          coreItems: '金牛座星辉(红) + 水瓶座星辉(红) + 双鱼座星辉(红) + 白羊座星辉(红)',
          starTarget: '先做金牛座黄3星 → 全套各3黄星',
          coreBonus: '护盾下混沌之风额外+13%伤害、护盾增伤+30%；分别强化扭曲腰带、双生钻头、双生雷电',
        },
        {
          setOrTier: '🛸 跨越星际的触手（高性价比无人机套）',
          coreItems: '星际跃迁矩阵图纸(红) + 超能神经元(红) + 水力推动脚蹼(金) + 克莱因瓶(金)',
          starTarget: '两件红藏各5黄星 + 两件金藏各红5（凑20黄星）',
          coreBonus: '最易成型的双生无人机套装：10黄星导弹数/伤害+5%，20黄星导弹数/伤害+10%，金藏红3还加暴击率',
        },
        {
          setOrTier: '❄️ 冰霜战靴典藏套（经典护盾冰缓套）',
          coreItems: '基因编辑器(红) + 梦境拼图(红) + 复制宝镜(红) + 赛博图腾柱(红)',
          starTarget: '每件各3黄星 → 逐步红3星',
          coreBonus: '每件3黄星获冰霜战靴每层冰霜血脉+10%护盾增伤、对冰缓目标伤害+50%；每件红3星充能层数+1',
        },
        {
          setOrTier: '🔥 6大必做传奇红藏单品',
          coreItems: '记忆编辑器、暗物质傀儡、水瓶座星辉、双鱼座星辉、金牛座星辉、梦境显影液',
          starTarget: '优先解锁图鉴 → 关键单品冲红3/红5',
          coreBonus: '覆盖宠物共鸣、扭曲腰带、星辰束腰、双生钻头、双生雷电五大核心伤害源',
        },
        {
          setOrTier: '⚡ 1~10期金收藏（红3星 +5%暴击率/暴伤）',
          coreItems: '第10期双子/处女/狮子座星辉、第8期脑机芯片、第7期兽火之炉、第6期微型人造太阳等',
          starTarget: '核心输出金收藏优先升至 红3星',
          coreBonus: '红3星直接提供5%暴击率或5%暴击伤害，且攻击型金藏升满额外提供 +2000 基础攻击力面板',
        },
      ],
      recommendations: [
        {
          tier: '收藏之心分配铁律',
          target: '优先把加暴击率、以及对应SS装备/主力双生配件的攻击型金收藏升到红3星',
          reason: '过滤掉纯加生命值的防守型金收藏，把高级收藏之心集中在红3星能出5%暴击/暴伤且满级+2000攻击的藏品上。',
        },
        {
          tier: '传奇红收藏自选箱优先级',
          target: '先凑「实现童年的梦想」25黄星 → 再做「金牛座星辉」3黄星 → 补齐「宇宙群星闪耀时」',
          reason: '宠物共鸣是当前版本不被稀释的独立乘区，25黄星+1秒持续时间收益冠绝全游。',
        },
      ],
      relatedArticleSlug: 'resources-6%e4%b8%aa%e5%bf%85%e5%81%9a%e7%9a%84%e7%ba%a2%e6%94%b6%e8%97%8f%e5%93%81%e6%8e%a8%e8%8d%90',
      sort: 4,
    },
    {
      code: 'tech-part-twin-and-overload',
      title: '双生配件谐振过载 & 载具零件洗练搭配矩阵',
      category: 'TECH_PART',
      summary:
        '整合《从入门到入土·载具篇》与配件谐振过载攻略：梳理双生合体配件打造顺位、谐振芯片投放与三大主力特工的载具零件词条优先级。',
      columns: [
        { key: 'module', label: '养成模块 / 主力特工', highlight: true },
        { key: 'priority1', label: '第一顺位（T0 必做）', highlight: true },
        { key: 'priority2', label: '第二顺位（T1 核心）' },
        { key: 'priority3', label: '第三顺位 / 过渡策略' },
        { key: 'rule', label: '核心避坑与操作法则' },
      ],
      rows: [
        {
          module: '⚙️ 双生配件合成顺位',
          priority1: '双生无人机 + 双生钻头',
          priority2: '双生足球 + 双生雷电 + 双生守卫者（骨骼湮灭装置）',
          priority3: '双生燃烧瓶 / 双生榴莲 / 双生立场',
          rule: '红色配件开启双生合体后，优先给无人机与钻头投放谐振芯片提高共鸣倍率',
        },
        {
          module: '🔋 配件谐振与过载消耗',
          priority1: '主力输出配件先凑1.2~1.6倍谐振',
          priority2: '开启骨骼湮灭装置（守卫者态）谐振过载',
          priority3: '辅助配件用富余红配做插件垫子',
          rule: '切忌拆掉作为双生合体插件的高星红配导致总谐振度暴跌',
        },
        {
          module: '🛸 载具选择与零件摆放',
          priority1: '主力候选：末世战马 / 幽焰逐影（幽灵狼）',
          priority2: '过渡载具：电动平衡车 / 科技滑板',
          priority3: '闲置载具装满剩余零件吃同步率属性',
          rule: '先铺满格子连成横线（横线特效仅出战车生效），全部铺满金后再用多余零件合红！',
        },
        {
          module: '🎯 维托尔 · 载具零件词条',
          priority1: '技能伤害 ＞ 首领伤害',
          priority2: '裂伤伤害 ＞ 护盾增伤',
          priority3: '异常伤害（毒衰 / 冰缓）',
          rule: '过渡紫/金零件少用洗练石（单次30/50/80递增），锁定毕业红零件再精调',
        },
        {
          module: '🎯 伊狑 844 · 载具零件词条',
          priority1: '首领伤害 ＞ 技能伤害',
          priority2: '裂伤伤害 ＞ 护盾增伤',
          priority3: '异常伤害（毒衰 / 冰缓）',
          rule: '从维托尔换伊狑会损失大量Boss增伤，需将载具部分异常词条改洗为首领伤害弥补',
        },
        {
          module: '🎯 塔洛西娅 · 载具零件词条',
          priority1: '技能伤害 ＞ 裂伤伤害',
          priority2: '首领伤害 ＞ 护盾增伤',
          priority3: '异常伤害（毒衰 / 冰缓）',
          rule: '塔洛西娅刚需面板裂伤达到约150%以支撑543阶段输出',
        },
      ],
      recommendations: [
        {
          tier: '载具零件第一铁律',
          target: '先铺满出战载具横线 → 闲置车铺满吃同步率 → 富余零件再升品',
          reason: '千万不要为了合一个高品质零件把出战载具拆出一大片空位导致少一列横线技能。',
        },
        {
          tier: '洗练石使用时机',
          target: '紫色及以上可洗练（30/50/80洗练石），仅对长期保留的高阶零件精洗',
          reason: '批量合成前务必先锁定带有「技能伤害/首领伤害/裂伤」的优质零件。',
        },
      ],
      relatedArticleSlug: 'resources-%e4%bb%8e%e5%85%a5%e9%97%a8%e5%88%b0%e5%85%a5%e5%9c%9f-%e8%bd%bd%e5%85%b7%e7%af%87',
      sort: 5,
    },
  ];
}

export function buildAllWikiEntries(): WikiEntryInput[] {
  const entries: WikiEntryInput[] = [];
  let sortCounter = 1;

  // 1. 特工图鉴 (AGENT)
  const agentConfigs: Array<{
    name: string;
    slug: string;
    sub: string;
    rarity: 'SP' | 'SS' | 'S' | 'COMMON';
    tier: string;
    summary: string;
    tags: string[];
    milestones: WikiMilestone[];
    articleSlugs: string[];
  }> = [
    {
      name: '哪吒',
      slug: 'agent-nezha',
      sub: 'SP神火特工',
      rarity: 'SP',
      tier: 'T0 神火基石',
      summary: '神火特工体系绝对基石，提供核心「神火」持续灼烧环境，伏尔甘与洛基的连携增伤均强依赖哪吒。',
      tags: ['SP特工', '神火基石', '紫焰降魔', '三昧真火'],
      milestones: [
        { stage: '0星解锁', effect: '解锁紫焰降魔与三昧真火，开启全队神火灼烧体系', isKeyNode: true },
        { stage: '觉醒1红星', effect: '解锁神火连携被动，大幅提升神火覆盖率与灼烧倍率', isKeyNode: true },
        { stage: '觉醒4红星', effect: '紫焰降魔进化，神火易伤乘区质变' },
      ],
      articleSlugs: ['event-%e4%bb%8e%e5%85%a5%e9%97%a8%e5%88%b0%e5%85%a5%e5%9c%9f-%e7%89%b9%e5%b7%a5%e7%af%87.md'],
    },
    {
      name: '伏尔甘',
      slug: 'agent-vulcan',
      sub: 'SP神火特工',
      rarity: 'SP',
      tier: 'T0 乘区核心',
      summary: '神火特工第二弹核心，自带神火与裂伤双乘区加成，觉醒1红星即可让武器技能开局等级+1，回响之战质变利器。',
      tags: ['SP特工', '神火淬炼', '火神熔炉', '开局技能+1'],
      milestones: [
        { stage: '觉醒1红星', effect: '战斗开局武器技能等级 +1，大幅提速回响之战超武成型', isKeyNode: true },
        { stage: '觉醒4红星', effect: '战斗开局武器技能等级 +2，神火/裂伤复合乘区拉满', isKeyNode: true },
      ],
      articleSlugs: ['event-%e4%bb%8e%e5%85%a5%e9%97%a8%e5%88%b0%e5%85%a5%e5%9c%9f-%e7%89%b9%e5%b7%a5%e7%af%87.md'],
    },
    {
      name: '洛基',
      slug: 'agent-loki',
      sub: 'SP神火特工',
      rarity: 'SP',
      tier: 'T0 连携余烬',
      summary: '神火特工第三弹核心，神火结束后附加「恶意余烬」多层阶梯增伤，4红星实现100%必中触发。',
      tags: ['SP特工', '恶意余烬', '神火连携', '4红星质变'],
      milestones: [
        { stage: '觉醒1红星', effect: '神火结束50%几率附加余烬，每层增伤5%（最高3层=15%）', isKeyNode: true },
        { stage: '觉醒4红星', effect: '余烬触发几率升至100%必中，每层增伤提至10%（最高30%）', isKeyNode: true },
        { stage: '觉醒6红星', effect: '余烬最大层数+2（叠满5层=50%独立增伤）', isKeyNode: true },
      ],
      articleSlugs: ['event-%e4%bb%8e%e5%85%a5%e9%97%a8%e5%88%b0%e5%85%a5%e5%9c%9f-%e7%89%b9%e5%b7%a5%e7%af%87.md'],
    },
    {
      name: '维托尔',
      slug: 'agent-vitor',
      sub: 'S级主力特工',
      rarity: 'SS',
      tier: 'T0 中后期主C',
      summary: '543增强版、741（112核）、840（141核）绝对主力出战特工，神火狂啸与高额首领爆发核心。',
      tags: ['主力特工', '543阵容', '741阵容', '840阵容', '爆发核心'],
      milestones: [
        { stage: '觉醒红5（543增强版）', effect: '搭配左凛音红3+右塔洛西娅红4，总计54特工核心成型', isKeyNode: true },
        { stage: '觉醒红7（741节点）', effect: '开启3连携槽位，总计112特工核心', isKeyNode: true },
        { stage: '觉醒红8（840节点）', effect: '开启4连携槽位（左凛音金6不觉醒），总计141特工核心', isKeyNode: true },
      ],
      articleSlugs: ['event-%e4%bb%8e%e5%85%a5%e9%97%a8%e5%88%b0%e5%85%a5%e5%9c%9f-%e7%89%b9%e5%b7%a5%e7%af%87.md'],
    },
    {
      name: '伊狑',
      slug: 'agent-yiling',
      sub: 'S级顶配特工',
      rarity: 'SS',
      tier: 'T0 844顶配主C',
      summary: '844顶配阵容（156核）出战主C，可额外召唤第1助战位宠物协同作战，配合红5河豚或超武燃烧瓶/火箭补足挂毒。',
      tags: ['844阵容', '双宠出战', '顶配主C', 'S特工'],
      milestones: [
        { stage: '觉醒红8（844节点）', effect: '中伊狑红8 + 左维托尔红4 + 右塔洛西娅红4（共156特工核心），召唤第1助战宠上场', isKeyNode: true },
      ],
      articleSlugs: ['event-%e4%bb%8e%e5%85%a5%e9%97%a8%e5%88%b0%e5%85%a5%e5%9c%9f-%e7%89%b9%e5%b7%a5%e7%af%87.md'],
    },
    {
      name: '塔洛西娅',
      slug: 'agent-taloshia',
      sub: 'S级核心特工',
      rarity: 'S',
      tier: 'T0 开荒主C / 后期右位',
      summary: '攒够120个S碎片后的首选特工！前期一路主C至觉醒红5且面板裂伤达150%，后期在741/840/844中稳坐右位红4协同。',
      tags: ['120碎片首选', '裂伤核心', '543主C', '右位红4协同'],
      milestones: [
        { stage: '解锁（120 S碎片）', effect: '替代科萌成为前中期最强主特工', isKeyNode: true },
        { stage: '觉醒红5 + 150%裂伤', effect: '543丐版核心主C，达标后可转型维托尔并将塔洛西娅转入右位红4协同', isKeyNode: true },
      ],
      articleSlugs: ['event-%e4%bb%8e%e5%85%a5%e9%97%a8%e5%88%b0%e5%85%a5%e5%9c%9f-%e7%89%b9%e5%b7%a5%e7%af%87.md'],
    },
    {
      name: '凛音',
      slug: 'agent-rinne',
      sub: 'S级挂毒特工',
      rarity: 'S',
      tier: 'T0 左位挂毒核心',
      summary: '543/741/840阵容左位灵魂辅助，提供极其稳定的Boss挂毒（中毒易伤）覆盖，搭配时务必始终放在左边槽位。',
      tags: ['左位固定', '全程挂毒', '协同核心', 'S特工'],
      milestones: [
        { stage: '觉醒红3（543节点）', effect: '凑满协同12星，实现Boss战全程不断毒', isKeyNode: true },
        { stage: '觉醒红1（741节点）', effect: '配合维托尔红7 + 塔洛西娅红4保持12星协同', isKeyNode: true },
        { stage: '金6不觉醒（840节点）', effect: '维托尔红8 + 塔洛西娅红4已满12星，凛音0觉醒放左位即可', isKeyNode: true },
      ],
      articleSlugs: ['event-%e4%bb%8e%e5%85%a5%e9%97%a8%e5%88%b0%e5%85%a5%e5%9c%9f-%e7%89%b9%e5%b7%a5%e7%af%87.md'],
    },
    {
      name: '科萌',
      slug: 'agent-common',
      sub: '初始特工',
      rarity: 'COMMON',
      tier: 'T1 开荒过渡 / 连携常客',
      summary: '新手初始特工，在攒满120个S碎片换塔洛西娅前全力使用；后期在543丐版中任右位红4，并提供通用连携被动。',
      tags: ['新手开荒', '543丐版右位', '通用连携'],
      milestones: [
        { stage: '金5星', effect: '提供全特工通用基础属性加成' },
        { stage: '觉醒红4（543丐版）', effect: '配合塔洛西娅红5 + 凛音红3凑齐平民12星协同', isKeyNode: true },
      ],
      articleSlugs: ['event-%e4%bb%8e%e5%85%a5%e9%97%a8%e5%88%b0%e5%85%a5%e5%9c%9f-%e7%89%b9%e5%b7%a5%e7%af%87.md'],
    },
  ];

  const extraAgents = [
    { name: '杨大师', sub: 'S级特工', rarity: 'S' as const, tier: 'T1 经典特工', summary: '经典阴阳太极体系S特工，可切换狂风掌与秘传气功弹施加阴阳易伤。' },
    { name: '威彻', sub: 'S级特工', rarity: 'S' as const, tier: 'T2 战术特工', summary: '具备极高单体穿透与机械协同能力的S级特工。' },
    { name: '乔伊', sub: 'S级特工', rarity: 'S' as const, tier: 'T1 战术特工', summary: '新世代战术爆发型S特工，具备强力范围压制与连携增益。' },
    { name: '金', sub: '普通特工', rarity: 'COMMON' as const, tier: 'T1 暴击协同', summary: '拥有招牌被动「直觉（暴击率加成）」，前期协同位与金5全属性必练特工。' },
    { name: '月咏', sub: '普通特工', rarity: 'COMMON' as const, tier: 'T2 全队属性', summary: '升至金5星可为全体特工提供宝贵的面板攻击力加成。' },
    { name: '沃尔默', sub: '普通特工', rarity: 'COMMON' as const, tier: 'T2 探测增伤', summary: '提供声波探测易伤与全特工面板属性加成。' },
    { name: '艾琳娜', sub: '普通特工', rarity: 'COMMON' as const, tier: 'T2 全队属性', summary: '升星解锁全体特工攻击/暴伤图鉴加成。' },
    { name: '凯蒂斯', sub: '普通特工', rarity: 'COMMON' as const, tier: 'T2 医疗无人机', summary: '召唤医疗无人机恢复血量，升星提供全特工基础属性。' },
    { name: '莱昂纳多', sub: 'SP联动特工（蓝龟）', rarity: 'SP' as const, tier: 'T0 联动裂伤', summary: '忍者神龟联动SP特工（蓝龟），提供高额裂伤与联动连携技能，金5加暴击率。' },
    { name: '拉斐尔', sub: 'SP联动特工（红龟）', rarity: 'SP' as const, tier: 'T0 联动暴击', summary: '忍者神龟联动SP特工（红龟），金5提供全特工暴击率+8%，联动连携优选。' },
    { name: '多纳泰罗', sub: 'SP联动特工（紫龟）', rarity: 'SP' as const, tier: 'T1 联动科技', summary: '忍者神龟联动SP特工（紫龟），升星提供全特工属性与联动被动。' },
    { name: '米开朗基罗', sub: 'SP联动特工（黄龟）', rarity: 'SP' as const, tier: 'T1 联动旋风', summary: '忍者神龟联动SP特工（黄龟），高频旋转打击与联动连携增益。' },
    { name: '斯普林特', sub: 'SP联动特工（老鼠大师）', rarity: 'SP' as const, tier: 'T1 宗师被动', summary: '忍者神龟联动宗师（老鼠），提供强力被动加成与全特工图鉴属性。' },
    { name: '爱普莉尔', sub: 'SP联动特工（记者）', rarity: 'SP' as const, tier: 'T1 战地记者', summary: '忍者神龟联动特工（记者），金5提供全特工暴击率加成。' },
  ];

  for (const ag of agentConfigs) {
    entries.push({
      slug: ag.slug,
      name: ag.name,
      category: 'AGENT',
      subcategory: ag.sub,
      rarity: ag.rarity,
      tier: ag.tier,
      icon: `/wiki-assets/特工/${ag.name}.png`,
      summary: ag.summary,
      tags: ag.tags,
      attributes: {
        slot: '特工',
        milestones: ag.milestones,
        acquisition: ag.rarity === 'SP' ? '限时神火/联动转盘活动 & SP万能碎片' : 'S特工碎片兑换 / 特工觉醒核心培养',
      },
      relatedArticleSlugs: ag.articleSlugs,
      sort: sortCounter++,
    });
  }

  for (const ag of extraAgents) {
    entries.push({
      slug: `agent-${encodeURIComponent(ag.name)}`,
      name: ag.name,
      category: 'AGENT',
      subcategory: ag.sub,
      rarity: ag.rarity,
      tier: ag.tier,
      icon: `/wiki-assets/特工/${ag.name}.png`,
      summary: ag.summary,
      tags: [ag.sub, ag.tier, '特工图鉴'],
      attributes: {
        slot: '特工',
        milestones: [
          { stage: '金5星', effect: '解锁全体特工通用攻击力或暴击率面板加成', isKeyNode: true },
        ],
        acquisition: ag.rarity === 'SP' ? '绝版联动活动获取' : '特工碎片合成',
      },
      relatedArticleSlugs: ['event-%e4%bb%8e%e5%85%a5%e9%97%a8%e5%88%b0%e5%85%a5%e5%9c%9f-%e7%89%b9%e5%b7%a5%e7%af%87.md'],
      sort: sortCounter++,
    });
  }

  // 2. 装备与神器 (EQUIPMENT) - 6大SS神装 + 核心S装备
  const ssEquips: Array<{
    name: string;
    file: string;
    slot: string;
    tier: string;
    summary: string;
    tags: string[];
    milestones: WikiMilestone[];
  }> = [
    {
      name: '双绝枪',
      file: 'ss武器-双绝枪-原始形态.png',
      slot: '武器',
      tier: 'No.1 首选必做',
      summary: '全游第一顺位必做SS神装！提供最高额直接攻击力面板、全武器技能增伤与「毁灭之痕」独立易伤；神炼顺位第2（紧随衣服之后）。',
      tags: ['SS神器', 'No.1必做', '武器', '神炼核心位', '混沌融合'],
      milestones: [
        { stage: '永恒1 + 破坏2', effect: '开局主武器直接满级超武，毁灭之痕伤害大幅提升', isKeyNode: true },
        { stage: '神炼2 / 神炼3 / 神炼5', effect: '累计消耗 2 / 4 / 10 个神炼核心，推荐在衣服神炼2后优先将武器追至神炼3与神炼5', isKeyNode: true },
        { stage: '全身SS混沌融合 18/27/36/45星', effect: '武器外观与机制依次进阶为：神罚之斧(18) → 镰刀(27) → 双刀(36) → 圣剑(45)', isKeyNode: true },
      ],
    },
    {
      name: '冰霜战靴',
      file: 'ss鞋子-冰霜战靴.png',
      slot: '鞋子',
      tier: 'No.2 爆发质变',
      summary: '第二件必做SS神装！独有「冰霜血脉」叠满5层提供高达 +60% 伤害加成，并对冰缓目标额外 +15% 增伤，合成门槛低且提升立竿见影。',
      tags: ['SS神器', 'No.2必做', '鞋子', '冰霜血脉', '冰缓增伤'],
      milestones: [
        { stage: '基础合成', effect: '冰霜血脉每层 +12% 伤害加成（最高5层 = +60%），冰缓易伤 +15%', isKeyNode: true },
        { stage: '搭配冰鞋典藏套3黄星', effect: '每层冰霜血脉额外 +10% 护盾增伤，对冰缓目标伤害 +50%', isKeyNode: true },
      ],
    },
    {
      name: '星辰束腰',
      file: 'ss腰带-星辰束腰.png',
      slot: '腰带',
      tier: 'No.3 攻防一体',
      summary: '常规第三件SS神装（微氪/中氪若用高星扭曲腰带可暂存背包），满能量提供 +25% 攻击力，总能量高于90%时额外 +30% 技能伤害。',
      tags: ['SS神器', 'No.3推荐', '腰带', '技能增伤', '异星神炼'],
      milestones: [
        { stage: '永恒1 + 破坏2', effect: '能量球拾取效率翻倍，90%以上能量常驻 +30% 技能伤害', isKeyNode: true },
        { stage: '神炼选择提醒', effect: '普通/微氪玩家通常穿戴S级扭曲腰带（配金牛座星辉），不建议为了神炼强转SS腰带' },
      ],
    },
    {
      name: '天启战衣',
      file: 'ss衣服-天启战衣.png',
      slot: '衣服',
      tier: 'No.4 永恒3质变 / 神炼第1顺位',
      summary: '神器核心够做「永恒3」时果断合成！永恒3解锁「血量高于10%时受伤先扣血再扣盾」，完美联动神铸3破坏项链实现残血满盾狂暴！神炼开启第一顺位。',
      tags: ['SS神器', '永恒3质变', '神炼第1顺位', '护盾增伤', '衣服'],
      milestones: [
        { stage: '永恒神铸 3星（核心质变）', effect: '破坏反噬：血量>10%时受伤先扣血再扣盾，配合破坏项链低血高暴击且全程保留护盾增伤', isKeyNode: true },
        { stage: '神炼 2（第1顺位开启）', effect: '仅需2个神炼核心，触发条件降至「护盾值高于血量30%」，极易全程覆盖', isKeyNode: true },
        { stage: '神炼 5 / 神炼 6', effect: '在武器与手套达到神炼5后，将衣服补至神炼5（累计30核）与神炼6（累计42核）', isKeyNode: true },
      ],
    },
    {
      name: '月殇护手',
      file: 'ss手套-月殇护手.png',
      slot: '手套',
      tier: 'No.5 暴击面板 / 神炼核心位',
      summary: '提供极高基础攻击面板与暴击加成（急需面板推主线时可提至第3件做）；神炼开启第3顺位，与武器并列优先追神炼3和神炼5。',
      tags: ['SS神器', '高额攻击面板', '暴击加成', '神炼核心位', '手套'],
      milestones: [
        { stage: '永恒1 + 破坏2', effect: '面板暴击率高于100%溢出的部分转化为高额暴击伤害', isKeyNode: true },
        { stage: '神炼 2 → 神炼 3 → 神炼 5', effect: '衣服神炼2后，武器与手套同步追至神炼3（总10核）与神炼5（总22核）', isKeyNode: true },
      ],
    },
    {
      name: '神罚项链',
      file: 'ss项链-神罚项链.png',
      slot: '项链',
      tier: 'No.6 大后期凑套',
      summary: '六件SS神装中基础增幅最低，前中期回响之战与远征表现不如神铸3破坏项链，仅在大后期追求全身混沌融能高星（混36/混45）时合成。',
      tags: ['SS神器', '大后期拼图', '混沌融能', '项链'],
      milestones: [
        { stage: '前中期避坑提醒', effect: '前中期请跳过SS项链，坚定使用神铸3「破坏者徽记（破坏项链）」', isKeyNode: true },
        { stage: '大后期混沌融合', effect: '配合全身SS凑齐混36（双刀）/ 混45（圣剑）总星数时再行启用' },
      ],
    },
  ];

  for (const eq of ssEquips) {
    entries.push({
      slug: `equip-ss-${encodeURIComponent(eq.name)}`,
      name: eq.name,
      category: 'EQUIPMENT',
      subcategory: 'SS神器',
      rarity: 'SS',
      tier: eq.tier,
      icon: `/wiki-assets/装备/SS级装备/${eq.file}`,
      summary: eq.summary,
      tags: eq.tags,
      attributes: {
        slot: eq.slot,
        milestones: eq.milestones,
        acquisition: '宇宙巡礼神铸合成（消耗永恒之石 + 破坏之石 + 基础科技素材 + 神器核心）',
      },
      relatedArticleSlugs: [
        'resources-ss%e8%a3%85%e5%a4%87%e5%90%88%e6%88%90%e9%a1%ba%e5%ba%8f',
        'resources-%e7%a5%9e%e7%82%bc%e9%a1%ba%e5%ba%8f%e6%8e%a8%e8%8d%90',
        'resources-%e5%85%a5%e9%97%a8%e5%88%b0%e5%85%a5%e5%9c%9f-%e8%a3%85%e5%a4%87%e7%af%87',
      ],
      sort: sortCounter++,
    });
  }

  // S级核心装备
  const sEquips: Array<{
    name: string;
    file: string;
    slot: string;
    tier: string;
    summary: string;
    tags: string[];
    milestones: WikiMilestone[];
  }> = [
    {
      name: '破坏者徽记（破坏项链）',
      file: '破坏者徽记.png',
      slot: '项链',
      tier: 'T0 传家宝神装',
      summary: '能用到退游的传家宝S项链！血量越低暴击率与暴伤越高，神铸3「信徒」击杀小怪重置狂暴时间，搭配SS天启战衣永恒3堪称绝配。',
      tags: ['S级装备', '传家宝', '低血高暴击', '神铸3质变', '项链'],
      milestones: [
        { stage: '红色传奇品质', effect: '血量越低，暴击率与技能伤害加成越高（最高 +40% 暴击率 & +40% 增伤）', isKeyNode: true },
        { stage: '神铸 3星「信徒」', effect: '狂暴状态下击杀怪物可无限刷新持续时间，配合SS衣服永恒3全程吃满加成', isKeyNode: true },
      ],
    },
    {
      name: '扭曲腰带（混乱腰带）',
      file: '混沌腰带-扭曲腰带 .png',
      slot: '腰带',
      tier: 'T0 最强S腰带',
      summary: '除破坏项链外保值率最高的S级神装！提供90%~160%高频能量波动增伤，配合第10期红藏「金牛座星辉」与宠物套爆发极强，微氪无需换SS腰带。',
      tags: ['S级装备', '能量波动', '金牛座星辉强化', '腰带'],
      milestones: [
        { stage: '红色传奇 + 神铸3', effect: '伤害波动区间大幅抬升，期望增伤超越低星SS腰带', isKeyNode: true },
        { stage: '联动金牛座星辉黄3星', effect: '大幅拉高扭曲腰带能量伤害上限，中微氪毕业之选', isKeyNode: true },
      ],
    },
    {
      name: '亡者之甲（混沌衣服）',
      file: '混沌衣服-亡者之甲.png',
      slot: '衣服',
      tier: 'T0 推关开荒神衣',
      summary: '主线卡关与200关飞碟领主救星！合红需6件本体，死亡后进入20秒幽灵无敌状态，击杀小怪可不断续时，是做出永恒3天启战衣前的绝对主力。',
      tags: ['S级装备', '推关神器', '幽灵无敌续时', '衣服'],
      milestones: [
        { stage: '红色传奇品质（6件本体）', effect: '死亡后进入幽灵状态且击杀小怪延长持续时间，低战力越级推图核心', isKeyNode: true },
      ],
    },
    {
      name: '永恒战衣',
      file: '永恒战衣.png',
      slot: '衣服',
      tier: 'T1 满血复活衣',
      summary: '提供多次满血复活与复活后攻击/移速加成，在天启战衣未达永恒3前是回响之战与BOSS战的稳健选择。',
      tags: ['S级装备', '复活增伤', '永恒套', '衣服'],
      milestones: [
        { stage: '红色传奇品质', effect: '额外增加1次复活机会（共2次复活），每次复活提升攻击力与移速', isKeyNode: true },
      ],
    },
    {
      name: '破坏者手甲（破坏手套）',
      file: '破坏手套.png',
      slot: '手套',
      tier: 'T1 首领增伤手套',
      summary: '对精英与首领敌人额外造成50%高额伤害，并附带血量斩杀光环，合成SS月殇护手前的最佳过渡手套。',
      tags: ['S级装备', '首领增伤+50%', '破坏套', '手套'],
      milestones: [
        { stage: '史诗/传奇品质', effect: '对首领与精英怪造成 +50% 伤害，神铸提升斩杀上限', isKeyNode: true },
      ],
    },
    {
      name: '破坏者具足（破坏鞋）',
      file: '破坏者具足.png',
      slot: '鞋子',
      tier: 'T1 移速增伤鞋',
      summary: '红色品质根据移动速度比例转化为高额伤害加成，是合成第二件SS神装「冰霜战靴」前的毕业S鞋。',
      tags: ['S级装备', '移速转增伤', '破坏套', '鞋子'],
      milestones: [
        { stage: '红色传奇品质', effect: '按移速差额提供最高 +50% 伤害加成', isKeyNode: true },
      ],
    },
    {
      name: '永恒项链',
      file: '永恒项链.png',
      slot: '项链',
      tier: 'T2 全被动增幅',
      summary: '对满血目标造成额外伤害并强化局内所有被动技能效果，前期过渡好手，中后期转神铸3破坏项链。',
      tags: ['S级装备', '被动强化', '永恒套', '项链'],
      milestones: [{ stage: '红色传奇品质', effect: '战斗中所有被动技能效果 +15%' }],
    },
    {
      name: '永恒手套',
      file: '永恒手套.png',
      slot: '手套',
      tier: 'T2 暴击回血',
      summary: '提供高额暴击率与暴击伤害加成，神铸1星解锁暴击击杀回血，续航能力极佳。',
      tags: ['S级装备', '暴击回血', '永恒套', '手套'],
      milestones: [{ stage: '神铸1星', effect: '暴击击败怪物恢复生命值，推图续航利器' }],
    },
    {
      name: '破坏之力',
      file: '破坏之力.png',
      slot: '武器',
      tier: 'T2 黑洞护盾枪',
      summary: '发射黑洞牵引敌群并在超武形态下生成无敌护盾，是合成SS双绝枪的核心祭品材料。',
      tags: ['S级装备', '黑洞控场', 'SS合成材料', '武器'],
      milestones: [{ stage: 'SS合成材料', effect: '拆解获得破坏之石，用于合成与神铸SS双绝枪' }],
    },
    {
      name: '追光者',
      file: '永恒武器-追光者.png',
      slot: '武器',
      tier: 'T2 永恒剑气',
      summary: '大范围剑气斩击武器，拆解可得永恒之石，是合成与神铸SS双绝枪的必备永恒系材料。',
      tags: ['S级装备', '剑气清屏', 'SS合成材料', '武器'],
      milestones: [{ stage: 'SS合成材料', effect: '拆解获得永恒之石，用于合成与永恒神铸SS装备' }],
    },
    {
      name: '混乱之剑',
      file: '混沌武器-混乱之剑.png',
      slot: '武器',
      tier: 'T2 混沌融能材料',
      summary: '混沌系S武器，拆解获得混沌之石，是开启SS神装「混沌融合（混18~混45）」的核心材料。',
      tags: ['S级装备', '混沌之石材料', '武器'],
      milestones: [{ stage: '混沌融合材料', effect: '拆解提供混沌之石，支撑SS武器斧头/镰刀/双刀/圣剑形态进化' }],
    },
  ];

  for (const eq of sEquips) {
    entries.push({
      slug: `equip-s-${encodeURIComponent(eq.name)}`,
      name: eq.name,
      category: 'EQUIPMENT',
      subcategory: 'S级装备',
      rarity: 'S',
      tier: eq.tier,
      icon: `/wiki-assets/装备/S级装备/${eq.file.replace(/\s+\./g, '.')}`,
      summary: eq.summary,
      tags: eq.tags,
      attributes: {
        slot: eq.slot,
        milestones: eq.milestones,
        acquisition: 'S级军备箱抽取 / S级杰出装备自选宝箱兑换',
      },
      relatedArticleSlugs: ['resources-%e5%85%a5%e9%97%a8%e5%88%b0%e5%85%a5%e5%9c%9f-%e8%a3%85%e5%a4%87%e7%af%87'],
      sort: sortCounter++,
    });
  }

  // 3. 收藏品 (COLLECTIBLE) - 扫描第1~10期传奇收藏品 & 史诗收藏品
  const candidatePackRoots = [
    path.resolve(__dirname, '../../skills/danke-strategy-skill/packs/danke/assets/img'),
    '/Users/hbt/skills/skills/danke-strategy-skill/packs/danke/assets/img',
  ];
  const skillPackImgRoot =
    candidatePackRoots.find((p) => fs.existsSync(p)) || candidatePackRoots[0];
  const legendaryRoot = path.join(skillPackImgRoot, '收藏品/传奇收藏品');
  const epicRoot = path.join(skillPackImgRoot, '收藏品/史诗收藏品');

  for (let ep = 1; ep <= 10; ep++) {
    const editionLabel = `第${ep}期`;
    const legEpDir = path.join(legendaryRoot, editionLabel);
    if (fs.existsSync(legEpDir)) {
      const files = fs.readdirSync(legEpDir).filter((f) => f.endsWith('.png'));
      for (const file of files) {
        const cleanFile = file.replace(/\s+\./g, '.');
        const rawName = cleanFile.replace(/\.png$/, '').trim();
        const meta = LEGENDARY_COLLECTIBLE_META[rawName];
        const isMustBuild = Boolean(meta && meta.tier.includes('T0'));
        entries.push({
          slug: `collectible-leg-ep${ep}-${encodeURIComponent(rawName)}`,
          name: rawName,
          category: 'COLLECTIBLE',
          subcategory: '传奇收藏品',
          edition: editionLabel,
          rarity: 'LEGENDARY',
          tier: meta?.tier || '传奇红藏',
          icon: `/wiki-assets/收藏品/传奇收藏品/${editionLabel}/${cleanFile}`,
          summary:
            meta?.summary ||
            `${editionLabel}传奇品质（红色）收藏品，升至红3星可解锁 +10% 暴击率词条，并参与高层级典藏套装共鸣。`,
          tags: [
            editionLabel,
            '传奇红藏',
            '暴击率',
            ...(isMustBuild ? ['T0 必做'] : []),
            ...(meta?.tags || []),
          ],
          attributes: {
            slot: `${editionLabel} · 传奇收藏品`,
            synergy: meta?.setInfo || `${editionLabel}典藏馆共鸣组合`,
            milestones: meta?.milestones || [
              { stage: '黄3星', effect: '激活对应典藏套装第一阶共鸣属性' },
              { stage: '红3星', effect: '解锁传奇核心词条：暴击率 +10%', isKeyNode: true },
              { stage: '红5星', effect: '专属技能增幅与最终攻击/生命面板拉满' },
            ],
            acquisition: `${editionLabel}收藏品宝箱 / 传奇收藏品自选宝箱`,
          },
          relatedArticleSlugs: [
            'resources-6%e4%b8%aa%e5%bf%85%e5%81%9a%e7%9a%84%e7%ba%a2%e6%94%b6%e8%97%8f%e5%93%81%e6%8e%a8%e8%8d%90',
            'resources-%e5%8a%a0%e6%9a%b4%e5%87%bb%e7%9a%84%e9%87%91%e6%94%b6%e8%97%8f%e7%af%87',
          ],
          sort: isMustBuild ? 100 + ep : 200 + sortCounter++,
        });
      }
    }

    const epicEpDir = path.join(epicRoot, editionLabel);
    if (fs.existsSync(epicEpDir)) {
      const files = fs.readdirSync(epicEpDir).filter((f) => f.endsWith('.png'));
      for (const file of files) {
        const cleanFile = file.replace(/\s+\./g, '.');
        const rawName = cleanFile.replace(/\.png$/, '').trim();
        const meta = EPIC_COLLECTIBLE_META[rawName] || {
          target: '指定S装备或科技配件',
          atkBonus: true,
          critType: '暴击伤害 +5%' as const,
        };
        const isCritRate = meta.critType.includes('暴击率');
        entries.push({
          slug: `collectible-epic-ep${ep}-${encodeURIComponent(rawName)}`,
          name: rawName,
          category: 'COLLECTIBLE',
          subcategory: '史诗收藏品',
          edition: editionLabel,
          rarity: 'EPIC',
          tier: isCritRate ? '红3暴击率+5%' : meta.atkBonus ? '红3暴伤+攻击' : '红3暴伤+5%',
          icon: `/wiki-assets/收藏品/史诗收藏品/${editionLabel}/${cleanFile}`,
          summary: `${editionLabel}史诗金收藏，专属强化【${meta.target}】。升至红3星解锁「${meta.critType}」${
            meta.atkBonus ? '，升满额外提供 +2000 最终攻击力面板！' : '。'
          }`,
          tags: [
            editionLabel,
            '史诗金藏',
            isCritRate ? '暴击率' : '暴击伤害',
            meta.critType,
            ...(meta.atkBonus ? ['满星+2000攻击'] : []),
            meta.target,
          ],
          attributes: {
            slot: `${editionLabel} · 史诗收藏品`,
            synergy: `专属强化：${meta.target}`,
            baseStats: meta.atkBonus ? ['满星最终攻击 +2000', `专属强化：${meta.target}`] : [`专属强化：${meta.target}`],
            milestones: [
              { stage: '红3星（核心节点）', effect: `解锁极品词条：${meta.critType}`, isKeyNode: true },
              {
                stage: '红5星（圆满毕业）',
                effect: `战斗中【${meta.target}】被动效果 +15% +6%${meta.atkBonus ? '，最终攻击 +2000' : ''}`,
                isKeyNode: meta.atkBonus,
              },
            ],
            acquisition: `${editionLabel}收藏品宝箱 / 史诗收藏品自选宝箱 / 高级收藏之心升星`,
          },
          relatedArticleSlugs: [
            'resources-1-10%e6%9c%9f%e5%8a%a0%e6%9a%b4%e4%bc%a4%e7%9a%84%e9%87%91%e6%94%b6%e8%97%8f',
            'resources-%e5%8a%a0%e6%9a%b4%e5%87%bb%e7%9a%84%e9%87%91%e6%94%b6%e8%97%8f%e7%af%87',
          ],
          sort: isCritRate ? 300 + ep : 400 + sortCounter++,
        });
      }
    }
  }

  // 4. 战术宠物与助战技能 (PET)
  const corePets: Array<{
    name: string;
    tier: string;
    rarity: 'S' | 'EPIC';
    summary: string;
    tags: string[];
    milestones: WikiMilestone[];
  }> = [
    {
      name: '幽暗之灵',
      tier: 'T0 版本第一S宠',
      rarity: 'S',
      summary: '当前版本综合评价第一S宠物！核心技能「永夜王冠」释放追踪魔法光束自动锁头首领，出战与助战放同名幽暗之灵可共享红星觉醒进度。',
      tags: ['S宠物', 'T0首选', '永夜王冠锁头', '觉醒共享'],
      milestones: [
        { stage: '解锁条件', effect: '将任意4只同类型普通宠物觉醒至5黄星（解锁后垫子宠必须保留5黄星）', isKeyNode: true },
        { stage: '出战 + 同名助战', effect: '相同S宠物共用觉醒进度，1只升红5则助战位同名幽暗之灵同步享红5共鸣率', isKeyNode: true },
      ],
    },
    {
      name: '加肥喵',
      tier: 'T1 甜品光环S宠',
      rarity: 'S',
      summary: 'S宠物强度榜第二梯队，主动技能释放持续10秒的甜品光环对范围内敌群造成高频伤害。',
      tags: ['S宠物', '甜品光环', '范围持续伤害'],
      milestones: [{ stage: '红5觉醒', effect: '大幅提升助战位共鸣增幅与光环倍率', isKeyNode: true }],
    },
    {
      name: '松鼠',
      tier: 'T1 坚果爆破S宠',
      rarity: 'S',
      summary: 'S宠物强力输出手，主动技能发射爆炸性火焰坚果持续10秒（仅出战状态生效）。',
      tags: ['S宠物', '坚果爆炸', '火焰爆发'],
      milestones: [{ stage: '红5觉醒', effect: '火焰坚果频率与共鸣伤害上限提升' }],
    },
    {
      name: '企鹅',
      tier: 'T1 冰雾控场S宠',
      rarity: 'S',
      summary: '召唤持续10秒的紧急冰冻雪雾，配合冰霜战靴与寒霜助战技能提供稳定冰缓覆盖。',
      tags: ['S宠物', '紧急冰冻', '冰缓联动'],
      milestones: [{ stage: '红5觉醒', effect: '雪雾范围与冰缓覆盖率提升' }],
    },
    {
      name: '卡皮',
      tier: 'T1 魔剑解放S宠',
      rarity: 'S',
      summary: '变身10秒释放魔剑坠落与魔化剑气，兼具帅气外观与范围爆发。',
      tags: ['S宠物', '魔化解放', '剑气爆发'],
      milestones: [{ stage: '红5觉醒', effect: '魔化解放持续输出大幅强化' }],
    },
    {
      name: '河豚',
      tier: 'T0 伊狑844挂毒宠',
      rarity: 'S',
      summary: '释放神经毒素光环附带中毒与衰弱效果！在伊狑844顶配阵容中，将觉醒红5河豚放在第1助战位即可随伊狑一同上场，完美解决回响挂毒问题。',
      tags: ['S宠物', '伊狑844必配', '第1助战位挂毒', '中毒衰弱'],
      milestones: [
        { stage: '觉醒红5（伊狑844专属）', effect: '放置于第1助战位，由伊狑召唤上场提供全程固定挂毒与衰弱', isKeyNode: true },
      ],
    },
    {
      name: '咕咕鸡',
      tier: 'T2 怒火骤雨S宠',
      rarity: 'S',
      summary: '进入狂怒状态向范围内敌人发射持续10秒的火焰羽毛。',
      tags: ['S宠物', '怒火骤雨', '远程弹幕'],
      milestones: [{ stage: '高星觉醒', effect: '提供稳定的助战共鸣倍率' }],
    },
    {
      name: '老鹰',
      tier: 'T0 萌新开荒神宠',
      rarity: 'EPIC',
      summary: '未解锁S宠物前（约25万战力阶段）性价比最高的普通过渡宠物！觉醒后锁头攻击效率极高，也是凑4只5黄星解锁S宠的常备主力。',
      tags: ['普通宠物首选', '25万战力过渡', '5黄星解锁S宠垫子'],
      milestones: [
        { stage: '觉醒5黄星', effect: '集齐4只同类型5黄星普通宠即可解锁S宠物（注意解锁后不可解散降星）', isKeyNode: true },
      ],
    },
    {
      name: '呱呱蛙',
      tier: 'T2 经典暴击蛙',
      rarity: 'EPIC',
      summary: '早期版本经典宠物，提供经验、暴击率与技能范围光环，后期可用于凑5黄星解锁S宠物。',
      tags: ['普通宠物', '暴击光环', 'S宠解锁材料'],
      milestones: [{ stage: '5黄星', effect: '作为4只5黄星普通宠之一解锁S宠物槽位' }],
    },
  ];

  for (const pet of corePets) {
    entries.push({
      slug: `pet-${encodeURIComponent(pet.name)}`,
      name: pet.name,
      category: 'PET',
      subcategory: pet.rarity === 'S' ? 'S级宠物' : '普通宠物',
      rarity: pet.rarity,
      tier: pet.tier,
      icon: `/wiki-assets/宠物/${pet.name}.png`,
      summary: pet.summary,
      tags: pet.tags,
      attributes: {
        slot: '战术宠物',
        milestones: pet.milestones,
        acquisition: pet.rarity === 'S' ? '异世宠物自选宝箱 / 4只5黄星普通宠解锁' : '宠物乐园抽取 / 史诗宠物宝箱',
      },
      relatedArticleSlugs: [
        'resources-%e4%bb%8e%e5%85%a5%e9%97%a8%e5%88%b0%e5%85%a5%e5%9c%9f-%e5%ae%a0%e7%89%a9%e7%af%87',
        'resources-%e5%bc%82%e5%ae%a0%e6%a0%b8%e5%bf%83%e6%b6%88%e8%80%97%e8%8a%82%e7%82%b9%e6%8e%a8%e8%8d%90',
      ],
      sort: sortCounter++,
    });
  }

  // 宠物助战技能词条
  const petSkillConfigs = [
    { name: '共鸣伤害', tier: 'T0 必带助战技', summary: '直接提升助战位宠物共鸣伤害倍率，不被常规增伤稀释的独立乘区，前3槽绝对必带！' },
    { name: '共鸣增幅', tier: 'T0 必带助战技', summary: '提升助战位共鸣触发概率，3只5红星S宠物搭配共鸣增幅即可达到100%共鸣概率上限！' },
    { name: '守护', tier: 'T1 核心助战技', summary: '自身存在护盾时对敌人造成额外百分比伤害，完美契合SS天启战衣与护盾体系。' },
    { name: '攻击力百分比', tier: 'T2 优质助战技', summary: '直接提升特工百分比攻击力面板，前4槽标准配置之一。' },
    { name: '毒素灌溉', tier: 'T3 异伤助战技', summary: '对中毒目标造成额外伤害，配合左位凛音或红5河豚稳定吃满。' },
    { name: '乘虚而入', tier: 'T3 异伤助战技', summary: '对衰弱目标造成额外伤害，第4~6助战槽补充技能优选。' },
    { name: '寒霜', tier: 'T3 异伤助战技', summary: '对冰缓目标造成额外伤害，联动SS冰霜战靴。' },
  ];

  for (const sk of petSkillConfigs) {
    entries.push({
      slug: `pet-skill-${encodeURIComponent(sk.name)}`,
      name: `宠物技能 · ${sk.name}`,
      category: 'PET',
      subcategory: '宠物助战技能',
      rarity: sk.tier.startsWith('T0') ? 'SS' : 'S',
      tier: sk.tier,
      icon: `/wiki-assets/技能图标/宠物技能/${sk.name}.png`,
      summary: sk.summary,
      tags: ['宠物助战技能', sk.tier, '异宠核心'],
      attributes: {
        slot: '助战技能槽（共6槽：0/0/21/50/90/150核解锁）',
        milestones: [
          { stage: '前3槽首选组合', effect: '共鸣伤害 + 共鸣增幅 + 守护 + 百分比攻击/异伤', isKeyNode: true },
        ],
      },
      relatedArticleSlugs: ['resources-%e4%bb%8e%e5%85%a5%e9%97%a8%e5%88%b0%e5%85%a5%e5%9c%9f-%e5%ae%a0%e7%89%a9%e7%af%87'],
      sort: sortCounter++,
    });
  }

  // 5. 科技配件 (TECH_PART)
  const techParts = [
    {
      name: '双生无人机',
      file: '双生无人机.png',
      tier: 'T0 绝对核心配件',
      summary: '全游第一顺位双生合体配件！毁灭者导弹自动追踪锁头，配合「跨越星际的触手」收藏品套装与谐振芯片提供海量单体爆发。',
      tags: ['双生配件', 'No.1必做', '谐振核心', '毁灭者'],
    },
    {
      name: '双生钻头',
      file: '双生钻头.png',
      tier: 'T0 穿透爆发核心',
      summary: '第二顺位双生合体配件！永恒钻头高频穿透Boss，受第10期红藏「水瓶座星辉」与第7期金藏「兽火之炉」专项增幅。',
      tags: ['双生配件', 'No.2必做', '水瓶座星辉强化', '穿透爆发'],
    },
    {
      name: '双生足球',
      file: '双生足球.png',
      tier: 'T0 量子弹射核心',
      summary: '高性价比双生输出配件，可进化为量子机器人（足球态/榴莲态），受微型人造太阳与风之元素之珠强力增幅。',
      tags: ['双生配件', '量子机器人', '高频弹射'],
    },
    {
      name: '双生雷电',
      file: '双生雷电.png',
      tier: 'T1 锁头落雷配件',
      summary: '双生合体落雷配件，受第10期红藏「双鱼座星辉」与第6期金藏「迷你戴森球」专项增幅，Boss战表现优异。',
      tags: ['双生配件', '双鱼座星辉强化', '单体落雷'],
    },
    {
      name: '双生守卫者（骨骼湮灭装置）',
      file: '双生守卫者.png',
      tier: 'T1 谐振过载核心',
      summary: '开启骨骼湮灭装置（守卫者态）谐振过载功能后，兼具击退控场与高额过载能量增幅。',
      tags: ['双生配件', '骨骼湮灭装置', '谐振过载'],
    },
    {
      name: '双生燃烧瓶',
      file: '双生燃烧瓶.png',
      tier: 'T1 超武挂毒核心',
      summary: '升至超武后具备关键的「挂毒」与范围灼烧易伤能力，是伊狑844阵容在回响之战中补挂毒的重要手段！',
      tags: ['双生配件', '超武挂毒', '火之元素之珠强化'],
    },
    {
      name: '双生榴莲',
      file: '双生榴莲.png',
      tier: 'T2 铁蒺藜近身增伤',
      summary: '双生榴莲与铁蒺藜合体，受第6期反粒子葫芦与第8期飞行器胶囊强化。',
      tags: ['双生配件', '铁蒺藜'],
    },
    {
      name: '双生立场',
      file: '双生立场.png',
      tier: 'T2 减速增伤光环',
      summary: '双生立场发生器，受等离子剑、通讯海螺与地之元素之珠多重收藏品增幅。',
      tags: ['双生配件', '范围光环'],
    },
    {
      name: '双生导弹',
      file: '双生导弹.png',
      tier: 'T2 超武火箭挂毒',
      summary: '超武火箭发射器形态，同样可在回响之战中为伊狑844阵容提供挂毒覆盖。',
      tags: ['双生配件', '超武火箭挂毒'],
    },
  ];

  for (const tp of techParts) {
    entries.push({
      slug: `tech-${encodeURIComponent(tp.name)}`,
      name: tp.name,
      category: 'TECH_PART',
      subcategory: '双生/谐振配件',
      rarity: tp.tier.startsWith('T0') ? 'SS' : 'S',
      tier: tp.tier,
      icon: `/wiki-assets/配件/${tp.file}`,
      summary: tp.summary,
      tags: tp.tags,
      attributes: {
        slot: '科技配件（攻击槽 / 防御槽）',
        milestones: [
          { stage: '红色传奇品质', effect: '解锁双生合体槽位，可嵌入3个红色配件作为谐振插件', isKeyNode: true },
          { stage: '谐振芯片 & 过载', effect: '投放谐振芯片提升总谐振倍率（1.2x ~ 3.0x+），激活过载独立增伤', isKeyNode: true },
        ],
        acquisition: '配件宝箱 / 传奇配件自选宝箱 / 公会与活动兑换',
      },
      relatedArticleSlugs: ['resources-%e9%85%8d%e4%bb%b6%e8%bf%87%e8%bd%bd%e6%b6%88%e8%80%97'],
      sort: sortCounter++,
    });
  }

  // 6. 载具 (MOUNT)
  const mounts = [
    {
      name: '幽焰逐影（幽灵狼）',
      file: '幽焰逐影.png',
      rarity: 'SS' as const,
      tier: 'T0 顶配主力载具',
      summary: '通关主线80章后解锁的传奇主力载具（幽灵狼），高星级下提供极强的爆发增伤与横线特效，与末世战马并列两大主力候选。',
      tags: ['传奇载具', '幽灵狼', '主力出战', '横线特效'],
    },
    {
      name: '末世战马',
      file: '末世战马.png',
      rarity: 'SS' as const,
      tier: 'T0 主力候选载具',
      summary: '强力传奇主力载具（战马），已有培养投入时表现极为扎实；优先铺满零件连成横线激活出战特殊效果。',
      tags: ['传奇载具', '战马', '主力出战', '横线特效'],
    },
    {
      name: '科技滑板',
      file: '科技滑板.png',
      rarity: 'S' as const,
      tier: 'T1 同步率/过渡载具',
      summary: '中期过渡载具，退居二线后装满富余零件，通过「同步率」按比例为出战角色提供可观的面板属性继承。',
      tags: ['过渡载具', '同步率继承', '零件容器'],
    },
    {
      name: '电动平衡车',
      file: '电动平衡车.png',
      rarity: 'EPIC' as const,
      tier: 'T2 入门初始载具',
      summary: '通关80章开启载具系统后的第一台入门载具，先利用手头资源把零件格子铺满连成横线，切忌早期盲目合红拆空槽位。',
      tags: ['入门载具', '80章解锁', '同步率继承'],
    },
  ];

  for (const mt of mounts) {
    entries.push({
      slug: `mount-${encodeURIComponent(mt.name)}`,
      name: mt.name,
      category: 'MOUNT',
      subcategory: '战术载具',
      rarity: mt.rarity,
      tier: mt.tier,
      icon: `/wiki-assets/载具/${mt.file}`,
      summary: mt.summary,
      tags: mt.tags,
      attributes: {
        slot: '载具系统（主线第80章解锁）',
        milestones: [
          { stage: '零件摆放铁律', effect: '先把所有格子铺满金色零件连成完整横线（横线特效仅出战车生效），多余材料再合红', isKeyNode: true },
          { stage: '洗练石规则', effect: '紫色及以上可洗练（首次30、二次50、后续80洗练石），维托尔优先洗技能伤害>首领伤害，伊狑优先首领伤害', isKeyNode: true },
          { stage: '同步率机制', effect: '闲置载具装上的零件按同步率百分比（如60%）提供面板属性，但不触发横线技能' },
        ],
        acquisition: '载具碎片合成 / 载具核心升星 / 零件宝箱钥匙抽取',
      },
      relatedArticleSlugs: [
        'resources-%e4%bb%8e%e5%85%a5%e9%97%a8%e5%88%b0%e5%85%a5%e5%9c%9f-%e8%bd%bd%e5%85%b7%e7%af%87',
        'resources-%e8%bd%bd%e5%85%b7%e9%9b%b6%e4%bb%b6%e6%91%86%e6%94%be%e6%94%bb%e7%95%a5',
      ],
      sort: sortCounter++,
    });
  }

  // 7. 局内状态 Debuff 与核心养成道具词条 (MECHANIC)
  const debuffs = [
    { name: '神火', summary: '由SP哪吒施加的核心异常状态，是触发伏尔甘神火乘区与洛基「恶意余烬（最高50%增伤）」的绝对前置条件。', tier: '核心独立乘区' },
    { name: '裂伤', summary: '塔洛西娅、伏尔甘与忍龟体系核心伤害乘区；塔洛西娅需面板裂伤达150%后方可转型维托尔。', tier: '核心爆发乘区' },
    { name: '冰缓', summary: '由SS冰霜战靴、企鹅等施加的减速控制状态，触发冰霜战靴+15%增伤、冰鞋典藏套+50%增伤及宠物寒霜助战技。', tier: '常驻控场易伤' },
    { name: '中毒', summary: '由左位凛音（红3协同12星全程挂毒）、超武燃烧瓶/超武火箭或红5河豚施加，触发毒素灌溉等高额中毒易伤。', tier: '必带挂毒乘区' },
    { name: '衰弱', summary: '降低目标攻击力并触发宠物助战技「乘虚而入」异常增伤，常与中毒同步覆盖。', tier: '异常增伤乘区' },
    { name: '易伤', summary: '使目标承受的所有伤害按百分比放大，属于极高价值的全局乘区。', tier: '全局增伤状态' },
    { name: '阴阳', summary: '杨大师专属状态切换机制，提供暴击率或高额技能易伤加成。', tier: '特工专属状态' },
    { name: '易损', summary: '破坏目标护甲防线，使其受到的暴击与技能伤害进一步提升。', tier: '破甲增伤状态' },
    { name: '禁足', summary: '完全限制非首领敌人移动，配合范围持续技能高效清场。', tier: '强控状态' },
    { name: '缴械', summary: '封锁敌人攻击动作，提升高压关卡生存容错。', tier: '防守控制状态' },
  ];

  for (const db of debuffs) {
    entries.push({
      slug: `mechanic-debuff-${encodeURIComponent(db.name)}`,
      name: `战斗状态 · ${db.name}`,
      category: 'MECHANIC',
      subcategory: '战斗Debuff词条',
      rarity: 'S',
      tier: db.tier,
      icon: `/wiki-assets/技能图标/战斗中debuff/${db.name}.png`,
      summary: db.summary,
      tags: ['局内状态', 'Debuff乘区', db.name, db.tier],
      attributes: {
        slot: '战斗异常状态 / 伤害乘区',
        milestones: [
          { stage: '乘区联动法则', effect: db.summary, isKeyNode: true },
        ],
      },
      relatedArticleSlugs: ['event-%e4%bb%8e%e5%85%a5%e9%97%a8%e5%88%b0%e5%85%a5%e5%9c%9f-%e7%89%b9%e5%b7%a5%e7%af%87.md'],
      sort: sortCounter++,
    });
  }

  const coreMaterials = [
    {
      name: '神器核心',
      file: '神器核心.png',
      tier: 'SS神铸核心通货',
      summary: '用于SS神装永恒神铸与破坏神铸的战略级材料；满约80个神器核心后可重点规划衣服、武器、手套的神炼进阶。',
    },
    {
      name: '神炼核心',
      file: '神炼核心.png',
      tier: 'SS神炼战略通货',
      summary: '目标装备达永恒4+破坏4后开启神炼，按「衣服→武器→手套」分 6、10、22、30、42 核五个阶段投入。',
    },
    {
      name: '异宠核心',
      file: '异宠核心.png',
      tier: 'S宠物槽位与觉醒通货',
      summary: '切忌乱开！累计消耗 21 / 50 / 90 / 150 个异宠核心分别解锁第 3 / 4 / 5 / 6 宠物助战槽位。',
    },
    {
      name: '特工觉醒核心',
      file: '特工觉醒核心.png',
      tier: '特工红星觉醒通货',
      summary: '支撑 543（54核）→ 741（112核）→ 840（141核）→ 伊狑844（156核）特工觉醒与连携槽开启的核心资源。',
    },
    {
      name: '谐振芯片',
      file: '谐振芯片.png',
      tier: '双生配件谐振通货',
      summary: '投入双生无人机、双生钻头、双生足球等核心配件，直接拉升配件谐振总倍率与过载上限。',
    },
  ];

  for (const mat of coreMaterials) {
    entries.push({
      slug: `mechanic-item-${encodeURIComponent(mat.name)}`,
      name: mat.name,
      category: 'MECHANIC',
      subcategory: '核心养成通货',
      rarity: 'SS',
      tier: mat.tier,
      icon: `/wiki-assets/道具/${mat.file}`,
      summary: mat.summary,
      tags: ['核心通货', '养成节点', mat.name],
      attributes: {
        slot: '战略级养成资源',
        milestones: [{ stage: '最优投放策略', effect: mat.summary, isKeyNode: true }],
        acquisition: '限时活动核心自选宝箱 / 公会远征 / 区域行动与常驻商店兑换',
      },
      relatedArticleSlugs: ['resources-%e7%a5%9e%e7%82%bc%e9%a1%ba%e5%ba%8f%e6%8e%a8%e8%8d%90'],
      sort: sortCounter++,
    });
  }

  return entries;
}

export async function syncWikiToCore(prisma: PrismaClient) {
  console.log('\n📚 开始执行 Wiki 资产镜像与结构化知识库同步...');

  // 1. 镜像静态图标到 danke-web/public/wiki-assets
  const candidateImgDirs = [
    path.resolve(__dirname, '../../skills/danke-strategy-skill/packs/danke/assets/img'),
    '/Users/hbt/skills/skills/danke-strategy-skill/packs/danke/assets/img',
  ];
  const srcImgDir =
    candidateImgDirs.find((p) => fs.existsSync(p)) || candidateImgDirs[0];
  const destImgDir = path.resolve(__dirname, '../../danke-web/public/wiki-assets');

  if (fs.existsSync(srcImgDir)) {
    copyDirRecursive(srcImgDir, destImgDir);
    console.log(`  ✔ 已镜像 285+ 高清游戏图标至: ${destImgDir}`);
  } else {
    console.warn(`  ⚠️ 未找到图标源目录: ${srcImgDir}`);
  }

  // 2. 同步 WikiEntry
  const entries = buildAllWikiEntries();
  for (const entry of entries) {
    await prisma.wikiEntry.upsert({
      where: { slug: entry.slug },
      update: {
        name: entry.name,
        category: entry.category,
        subcategory: entry.subcategory,
        edition: entry.edition,
        rarity: entry.rarity,
        tier: entry.tier,
        icon: entry.icon,
        summary: entry.summary,
        tags: JSON.stringify(entry.tags),
        attributes: JSON.stringify(entry.attributes),
        relatedArticleSlugs: JSON.stringify(entry.relatedArticleSlugs),
        sort: entry.sort,
        enabled: true,
      },
      create: {
        slug: entry.slug,
        name: entry.name,
        category: entry.category,
        subcategory: entry.subcategory,
        edition: entry.edition,
        rarity: entry.rarity,
        tier: entry.tier,
        icon: entry.icon,
        summary: entry.summary,
        tags: JSON.stringify(entry.tags),
        attributes: JSON.stringify(entry.attributes),
        relatedArticleSlugs: JSON.stringify(entry.relatedArticleSlugs),
        sort: entry.sort,
        enabled: true,
      },
    });
  }
  console.log(`  ✔ 已同步 ${entries.length} 条结构化 Wiki 图鉴词条到 danke-core 数据库`);

  // 3. 同步 ProgressionMatrix
  const matrices = buildProgressionMatrices();
  for (const m of matrices) {
    await prisma.progressionMatrix.upsert({
      where: { code: m.code },
      update: {
        title: m.title,
        category: m.category,
        summary: m.summary,
        columns: JSON.stringify(m.columns),
        rows: JSON.stringify(m.rows),
        recommendations: JSON.stringify(m.recommendations),
        relatedArticleSlug: m.relatedArticleSlug,
        sort: m.sort,
        enabled: true,
      },
      create: {
        code: m.code,
        title: m.title,
        category: m.category,
        summary: m.summary,
        columns: JSON.stringify(m.columns),
        rows: JSON.stringify(m.rows),
        recommendations: JSON.stringify(m.recommendations),
        relatedArticleSlug: m.relatedArticleSlug,
        sort: m.sort,
        enabled: true,
      },
    });
  }
  console.log(`  ✔ 已同步 ${matrices.length} 张养成消耗与优先级精算矩阵到 danke-core 数据库`);

  // 4. 生成 danke-web/lib/local-wiki-data.ts 静态兜底文件
  const handbookGuides = buildHandbookGuides();
  const localWikiDataPath = path.resolve(__dirname, '../../danke-web/lib/local-wiki-data.ts');
  const fileContent = `// AUTO-GENERATED BY danke-core/scripts/sync-wiki-to-core.ts — DO NOT EDIT MANUALLY

export interface WikiMilestone {
  stage: string;
  effect: string;
  isKeyNode?: boolean;
}

export interface WikiEntryAttributes {
  slot?: string;
  baseStats?: string[];
  milestones?: WikiMilestone[];
  acquisition?: string;
  synergy?: string;
}

export interface WikiEntryItem {
  slug: string;
  name: string;
  category: 'AGENT' | 'EQUIPMENT' | 'COLLECTIBLE' | 'PET' | 'TECH_PART' | 'MOUNT' | 'MECHANIC';
  subcategory?: string;
  edition?: string;
  rarity: 'SS' | 'SP' | 'S' | 'LEGENDARY' | 'EPIC' | 'COMMON';
  tier?: string;
  icon: string;
  summary: string;
  tags: string[];
  attributes: WikiEntryAttributes;
  relatedArticleSlugs: string[];
  sort: number;
}

export interface ProgressionMatrixItem {
  code: string;
  title: string;
  category: 'EQUIPMENT' | 'PET' | 'TECH_PART' | 'AGENT' | 'COLLECTIBLE';
  summary: string;
  columns: { key: string; label: string; highlight?: boolean }[];
  rows: Record<string, any>[];
  recommendations: { tier: string; target: string; reason: string }[];
  relatedArticleSlug?: string;
  sort: number;
}

export interface HandbookGuideItem {
  id: string;
  chapter: string;
  title: string;
  subtitle: string;
  category: string;
  routeSummary: string;
  keyTakeaways: string[];
  articleSlug: string;
  wikiCategory: string;
  matrixCode: string;
  accentColor: string;
}

export const LOCAL_HANDBOOK_GUIDES: HandbookGuideItem[] = ${JSON.stringify(handbookGuides, null, 2)};

export const LOCAL_PROGRESSION_MATRICES: ProgressionMatrixItem[] = ${JSON.stringify(matrices, null, 2)};

export const LOCAL_WIKI_ENTRIES: WikiEntryItem[] = ${JSON.stringify(entries, null, 2)};
`;

  fs.writeFileSync(localWikiDataPath, fileContent, 'utf-8');
  console.log(`  ✔ 已生成前端静态兜底字典: ${localWikiDataPath}`);
}
