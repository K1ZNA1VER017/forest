export const regions = [
  {
    id: "forest",
    name: "Серый лес",
    subtitle: "Там, где вы проснулись",
    ground: 0x456848,
    fog: 0x253e45,
    color: "#7aaf83",
    boss: "Терновый пастырь",
    npc: "Элла · травница",
    enemy: "wolf",
    seal: "Корень",
    lore: "Вы узнаёте узор на камне. Когда-то вы были одним из хранителей.",
  },
  {
    id: "mire",
    name: "Тихая топь",
    subtitle: "Голоса под водой",
    ground: 0x38564e,
    fog: 0x213d45,
    color: "#6faeb3",
    boss: "Голос трясины",
    npc: "Иара · перевозчица",
    enemy: "wisp",
    seal: "Прилив",
    lore: "Узник звал вас по имени. Он не обещал силы. Он просил вспомнить правду.",
  },
  {
    id: "quarry",
    name: "Пепельный карьер",
    subtitle: "Камень хранит жар",
    ground: 0x695b4d,
    fog: 0x443b3e,
    color: "#d3a578",
    boss: "Кузнец тишины",
    npc: "Орн · каменщик",
    enemy: "golem",
    seal: "Пламя",
    lore: "Печать питалась чужими воспоминаниями. Вы добровольно отдали свои, чтобы её удержать.",
  },
  {
    id: "frost",
    name: "Белый перевал",
    subtitle: "Последний свет наверху",
    ground: 0x9caeb0,
    fog: 0x667e91,
    color: "#bed8e4",
    boss: "Смотритель зимы",
    npc: "Вея · хранительница",
    enemy: "shade",
    seal: "Иней",
    lore: "Заключённый не невиновен. Но вечная тюрьма превратила его боль в Бездну. Решение снова за вами.",
  },
] as const;
export type Campaign = {
  seals: string[];
  floor: number;
  deepest: number;
  ending: "" | "seal" | "free";
  benchLevel: number;
  storageLevel: number;
  weaponUpgrade: number;
  skillPoints: number;
  talents: string[];
  quests: string[];
  returnZone: string;
  bosses: string[];
  journal: string[];
  runKills: string[];
};
export const campaignDefaults: Campaign = {
  seals: [],
  floor: 1,
  deepest: 0,
  ending: "",
  benchLevel: 1,
  storageLevel: 1,
  weaponUpgrade: 0,
  skillPoints: 1,
  talents: [],
  quests: [],
  returnZone: "forest",
  bosses: [],
  journal: [],
  runKills: [],
};
export const talents = [
  {
    id: "ward",
    name: "Покров пустоты",
    desc: "F: 50% защиты на 5 с. 18 маны, 12 с перезарядки.",
    icon: "shield",
    requires: "",
  },
  {
    id: "flow",
    name: "Тихое течение",
    desc: "Регенерация маны увеличена с 2.2 до 4 в секунду.",
    icon: "mana",
    requires: "",
  },
  {
    id: "echo",
    name: "Эхо удара",
    desc: "Всплеск наносит на 25% больше урона.",
    icon: "rune",
    requires: "flow",
  },
  {
    id: "step",
    name: "Лёгкий след",
    desc: "Перезарядка рывка сокращена с 3 до 2 секунд.",
    icon: "feather",
    requires: "",
  },
  {
    id: "siphon",
    name: "Искра жизни",
    desc: "Каждое убийство восстанавливает 8 HP.",
    icon: "potion",
    requires: "step",
  },
  {
    id: "edge",
    name: "Память клинка",
    desc: "Все атаки оружием наносят +6 урона.",
    icon: "sword",
    requires: "ward",
  },
] as const;
export const floorLayouts = [
  [
    [0, 1],
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, -1],
  ],
  [
    [0, 1],
    [1, 1],
    [1, 0],
    [0, 0],
    [0, -1],
  ],
  [
    [0, 1],
    [-1, 1],
    [-1, 0],
    [0, 0],
    [0, -1],
  ],
  [
    [0, 1],
    [0, 0],
    [1, 0],
    [1, -1],
    [0, -1],
  ],
  [
    [0, 1],
    [0, 0],
    [-1, 0],
    [1, 0],
    [0, -1],
  ],
] as const;
export function regionUnlocked(seals: string[], index: number) {
  return index === 0 || seals.includes(regions[index - 1].id);
}
export function canDescend(seals: string[]) {
  return regions.every((r) => seals.includes(r.id));
}
