/** Data-only RPG rules. All persistence remains local in this prototype. */
export const heroes = ["warrior", "mage", "archer", "rogue", "knight"] as const;
export type Hero = (typeof heroes)[number];
export const heroNames: Record<Hero, string> = {
  warrior: "Воин",
  mage: "Маг",
  archer: "Следопыт",
  rogue: "Тень",
  knight: "Рыцарь",
};
export type Weapon = "sword" | "bow" | "staff";
export type Progress = {
  hero: Hero;
  gold: number;
  herbs: number;
  ore: number;
  armor: boolean;
  armorEquipped: boolean;
  bow: boolean;
  staff: boolean;
  weapon: Weapon;
  strength: number;
  vitality: number;
  focus: number;
  points: number;
  herbalistDone: boolean;
};
export const defaults: Progress = {
  hero: "warrior",
  gold: 0,
  herbs: 0,
  ore: 0,
  armor: false,
  armorEquipped: false,
  bow: false,
  staff: false,
  weapon: "sword",
  strength: 0,
  vitality: 0,
  focus: 0,
  points: 2,
  herbalistDone: false,
};
export function maxHealth(s: Progress & { level: number }) {
  return 100 + (s.level - 1) * 15 + s.vitality * 10;
}
export function damage(s: Progress & { blade: boolean }) {
  return (
    (s.weapon === "bow" ? 19 : s.weapon === "staff" ? 24 : s.blade ? 28 : 17) +
    s.strength * 3
  );
}
export function spellDamage(s: Progress) {
  return 35 + s.focus * 5;
}
export const icon = (name: string, cls = "") =>
  `<img class="pixel-icon ${cls}" src="/assets/item-${name}.png" alt="" draggable="false">`;
export const recipes = [
  {
    id: "blade",
    name: "Клинок пепла",
    icon: "sword",
    description: "28 базового урона · ближний бой",
    wood: 3,
    ore: 0,
    herbs: 0,
    shard: true,
  },
  {
    id: "bow",
    name: "Лесной лук",
    icon: "bow",
    description: "19 базового урона · дальность 7",
    wood: 4,
    ore: 0,
    herbs: 0,
    shard: false,
  },
  {
    id: "staff",
    name: "Рунный посох",
    icon: "crystal",
    description: "24 базового урона · дальность 6 · 3 маны",
    wood: 2,
    ore: 2,
    herbs: 0,
    shard: true,
  },
  {
    id: "armor",
    name: "Кожаный доспех",
    icon: "armor",
    description: "Снижает входящий урон на 4",
    wood: 2,
    ore: 2,
    herbs: 0,
    shard: false,
  },
  {
    id: "potion",
    name: "Лечебное зелье",
    icon: "potion",
    description: "Восстанавливает 50 здоровья",
    wood: 0,
    ore: 0,
    herbs: 2,
    shard: false,
  },
] as const;
