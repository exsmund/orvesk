import weapons from "../../../data/weapons.json";
import jewelry from "../../../data/jewelry.json";
import armor from "../../../data/armor.json";
import type { Item, Stat, DamageType, Action, Slot } from "../types";
export const ITEMS = [...weapons, ...armor, ...jewelry] as Item[];
export const item = (id?: string | null): Item =>
  ITEMS.find((i) => i.id === id) ?? ITEMS[0];
export const STATS: Record<Stat, string> = {
  strength: "Сила",
  agility: "Ловкость",
  endurance: "Выносливость",
  intelligence: "Интеллект",
  reaction: "Реакция",
};
export const DAMAGE: Record<DamageType, string> = {
  pierce: "Колющий",
  slash: "Режущий",
  blunt: "Дробящий",
  frost: "Мороз",
  fire: "Огонь",
  wind: "Ветер",
  magic: "Магический",
};
export const SLOTS: Record<Slot, string> = {
  weapon: "Правая рука",
  shield: "Левая рука",
  body: "Тело",
  feet: "Ноги",
  ring: "Кольцо",
  amulet: "Амулет",
};
export const ACTIONS: Record<
  Action,
  { name: string; short: string; text: string }
> = {
  attack: {
    name: "Шаг и атака",
    short: "Атака",
    text: "1 сила, ещё 1 за шаг. Без раскрытия. Удобна для сближения и добивания.",
  },
  heavy: {
    name: "Сильная атака",
    short: "Сильная атака",
    text: "3 силы. Урон ×1,5; +4 против блока. Раскрывает вас до конца следующего хода, промах — ещё на ход.",
  },
  block: {
    name: "Шаг и блок",
    short: "Блок",
    text: "Без затрат, шаг — 1 сила. Защита щитом или руками; восстанавливает устойчивость. Истощённый блок не бывает полным.",
  },
  parry: {
    name: "Парирование и рипост",
    short: "Парирование",
    text: "1 сила. Рипост при успехе; +5 против сильной атаки, бонус от ловкости. Не парирует пинок и щит.",
  },
  kick: {
    name: "Пинок ногой",
    short: "Пинок",
    text: "2 силы. Отнимает 3 устойчивости при контакте, срывает сильную атаку. Падение при нулевой устойчивости.",
  },
  equip: {
    name: "Подобрать / сменить",
    short: "Смена оружия",
    text: "1 сила. Поднять предмет или освободить руку. Выбор вещи занимает ход.",
  },
  shield: {
    name: "Удар щитом",
    short: "Удар щитом",
    text: "2 силы. Урон: сила + 1. Попадание отталкивает на 40 см; контакт снимает 2 устойчивости.",
  },
  rest: {
    name: "Передышка",
    short: "Передышка",
    text: "Восстанавливает 3 силы и 2 устойчивости. Без атаки и защиты.",
  },
};
