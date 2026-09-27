# Сводка изображений

Дата: 2026-09-27. Проверены исходники и каталоги браузерной игры и Godot.

**Как читать:** считаются уникальные файлы, а не число показов или ссылок. «Браузер» и «Мобильная» могут пересекаться. «Без подключения» означает отсутствие ссылки из игровых каталогов и кода этих двух клиентов; это не разрешение удалить файл. Референсы, архивы, Storybook и тестовые страницы отмечены отдельно. Каталожный портрет считается подключённым, даже если сюжет с ним ещё не реализован. Статический анализ не доказывает, что каждый экран реально посещён.

В `public` колонка мобильной версии означает использование оригинала через копию `mobile/content/generated/art`. Сами копии посчитаны отдельно как физические файлы. Старые копии не очищаются скриптом синхронизации. Исключены зависимости, `.git`, `.godot`, `dist`, `storybook-static` (производные сборки, не авторские ассеты).

| Директория | Всего | Браузер | Мобильная | Без подключения | Назначение |
|---|---:|---:|---:|---:|---|
| refs/items | 3 | 0 | 0 | 3 | Эталоны предметов для художественного направления |
| mobile/content/generated | 1 | 0 | 1 | 0 | Иконка приложения |
| mobile/content/generated/art/actions | 3 | 0 | 2 | 1 | Мобильные копии: Базовые действия героя |
| mobile/content/generated/art/creatures/actions | 36 | 0 | 18 | 18 | Мобильные копии: Природные действия существ |
| mobile/content/generated/art/creatures/portraits | 41 | 0 | 41 | 0 | Мобильные копии: Портреты существ и диалоговых собеседников |
| mobile/content/generated/art/items | 114 | 0 | 57 | 57 | Мобильные копии: Предметы и изображения действий экипировки |
| mobile/content/generated/art/portraits | 35 | 0 | 35 | 0 | Мобильные копии: Портреты людей |
| mobile/content/generated/art/skills | 10 | 0 | 6 | 4 | Мобильные копии: Иллюстрации навыков |
| mobile/content/generated/art/terrain | 1 | 0 | 0 | 1 | Мобильные копии: Текстура поля и препятствий |
| mobile/content/generated/art/ui | 7 | 0 | 5 | 2 | Мобильные копии: Фоны, рамки, кнопки, валюта, силуэты |
| mobile/content/generated/art/ui/battle-modes | 2 | 0 | 2 | 0 | Мобильные копии: Значки режимов боя |
| mobile/content/generated/art/ui/journey | 4 | 0 | 4 | 0 | Мобильные копии: Значки этапов маршрута |
| mobile/content/generated/art/ui/journey/maps | 6 | 0 | 6 | 0 | Мобильные копии: Фоны карт и боёв |
| mobile/content/ui | 11 | 0 | 10 | 1 | Собственные рамки, клетки и кнопки Godot |
| public | 1 | 1 | 1 | 0 | Иконка вкладки / приложения |
| public/characters | 32 | 0 | 0 | 32 | Сюжетные персонажи: подготовлены в data/story-characters.json, сюжетный интерфейс ещё не подключён |
| public/actions | 3 | 2 | 2 | 1 | Базовые действия героя |
| public/creatures/actions | 38 | 18 | 18 | 20 | Природные действия существ |
| public/creatures/portraits | 41 | 41 | 41 | 0 | Портреты существ и диалоговых собеседников |
| public/items | 114 | 57 | 57 | 57 | Предметы и изображения действий экипировки |
| public/portraits | 35 | 35 | 35 | 0 | Портреты людей |
| public/skills | 10 | 6 | 6 | 4 | Иллюстрации навыков |
| public/terrain | 4 | 4 | 0 | 0 | Текстура поля и препятствий |
| public/ui | 23 | 16 | 5 | 6 | Фоны, рамки, кнопки, валюта, силуэты |
| public/ui/battle-modes | 3 | 2 | 2 | 1 | Значки режимов боя |
| public/ui/journey | 4 | 4 | 4 | 0 | Значки этапов маршрута |
| public/ui/journey/maps | 6 | 6 | 6 | 0 | Фоны карт и боёв |
| browser/public/ui/navigation | 9 | 7 | 0 | 2 | Навигационные иконки |
| refs | 3 | 0 | 0 | 3 | Художественные референсы |

Всего физических изображений: **600**. Без подключения к двум клиентам: **213**.

## Очистка исходников 2026-09-27

Удалены 57 неиспользуемых архивных PNG: 35 концептов из `assets/characters/concepts/portraits-v1…v4` и 22 исходника из `assets/items/generated-v1`. Освобождено 121 553 525 байт (около 116 МиБ). Сохранены промпты; три эталона перенесены в `refs/items`: `dagger.png`, `buckler.png`, `robe.png`, на которые ссылается `docs/ITEM_ART_DIRECTION.md`. Активные изображения и старые версии из `public` и мобильных каталогов этой очисткой не затрагивались.

## Уточнения

- `public/terrain/rock*.png` подключены кодом, но камни отключены настройкой `rockChance: 0`; три изображения сейчас не появляются в новых боях.
- Аттрактор и мирные существа подключены к каталогу портретов; это готовность к диалогам, а не подтверждение готовых сюжетных сцен.
- В браузере валюта пока `soul-wisp-v1.png`; мобильный клиент использует `logos-shards-v3.png`.
- Файлы с `transparent-v2` — новая активная серия. Большинство соответствующих старых непрозрачных файлов осталось для истории.

## Где показываются активные группы

| Группа | Браузер | Мобильная версия |
|---|---|---|
| Предметы | ItemIcon, EquipmentIcon, EquipmentDoll, ItemInspection; ActionSource → ActionFigure и клетки боя | character_equipment, character_window, reward_grid; figure_art → board |
| Базовые и природные действия | ActionSource → ActionFigure, ReactionBoard, описание клетки и FigureCard | figure_art → board, описание фигур |
| Навыки | SkillIcon, SkillCard, FighterSkills; боевые фигуры через ActionSource | character_equipment, main, figure_art |
| Портреты людей | Создание героя, CharacterPortrait, CharacterCard, шапка боя | Создание героя, game_header, character_window |
| Портреты существ | Каталог creatures → portrait(), CharacterPortrait и CharacterCard; мирные — подготовлены для диалогов | catalog.portrait() → game_header / character_window; мирные — подготовлены для диалогов |
| Карты и фоны боя | JourneyMap и фон игрового экрана через journey-maps | main.gd через data.maps |
| Этапы карты | JourneyNodeIcon / JourneyMap | journey_map |
| Режимы | BattleModeArtwork | game_header |
| Навигация | GothicIcon, кнопки интерфейса | Браузерные иконки не используются |
| Собственные мобильные рамки | Не используются | board, figure_art, reward_grid, square_button, gothic_theme |

## Пофайловые ссылки и неподключённые файлы

### `refs/items`

Эталоны заменены точными копиями прозрачных `public/items/{dagger,buckler,robe}-transparent-v2.png`. Количество файлов не изменилось.

Все три файла используются как визуальные ориентиры в `docs/ITEM_ART_DIRECTION.md`, хотя в игровых клиентах напрямую не подключены.

- `buckler.png` — Нет подключения в двух клиентах.
- `dagger.png` — Нет подключения в двух клиентах.
- `robe.png` — Нет подключения в двух клиентах.

### `mobile/content/generated`

- `icon.svg` — Мобильная: mobile/project.godot.

### `mobile/content/generated/art/actions`

- `guard-transparent-v2.png` — Мобильная: data/base-figures.json.
- `kick-transparent-v2.png` — Мобильная: data/base-figures.json.
- `kick.png` — Нет подключения в двух клиентах.

### `mobile/content/generated/art/creatures/actions`

- `ash-transparent-v2.png` — Мобильная: data/creatures.json.
- `ash.png` — Нет подключения в двух клиентах.
- `bite-transparent-v2.png` — Мобильная: data/creatures.json.
- `bite.png` — Нет подключения в двух клиентах.
- `claw-transparent-v2.png` — Мобильная: data/creatures.json.
- `claw.png` — Нет подключения в двух клиентах.
- `constrict-transparent-v2.png` — Мобильная: data/creatures.json.
- `constrict.png` — Нет подключения в двух клиентах.
- `evade-transparent-v2.png` — Мобильная: data/creatures.json.
- `evade.png` — Нет подключения в двух клиентах.
- `horn-transparent-v2.png` — Мобильная: data/creatures.json.
- `horn.png` — Нет подключения в двух клиентах.
- `magic-transparent-v2.png` — Мобильная: data/creatures.json.
- `magic.png` — Нет подключения в двух клиентах.
- `mind-transparent-v2.png` — Мобильная: data/creatures.json.
- `mind.png` — Нет подключения в двух клиентах.
- `mirror-transparent-v2.png` — Мобильная: data/creatures.json.
- `mirror.png` — Нет подключения в двух клиентах.
- `poison-transparent-v2.png` — Мобильная: data/creatures.json.
- `poison.png` — Нет подключения в двух клиентах.
- `root-transparent-v2.png` — Мобильная: data/creatures.json.
- `root.png` — Нет подключения в двух клиентах.
- `slam-transparent-v2.png` — Мобильная: data/creatures.json.
- `slam.png` — Нет подключения в двух клиентах.
- `spores-transparent-v2.png` — Мобильная: data/creatures.json.
- `spores.png` — Нет подключения в двух клиентах.
- `talon-transparent-v2.png` — Мобильная: data/creatures.json.
- `talon.png` — Нет подключения в двух клиентах.
- `tentacle-transparent-v2.png` — Мобильная: data/creatures.json.
- `tentacle.png` — Нет подключения в двух клиентах.
- `veil-transparent-v2.png` — Мобильная: data/creatures.json.
- `veil.png` — Нет подключения в двух клиентах.
- `ward-transparent-v2.png` — Мобильная: data/creatures.json.
- `ward.png` — Нет подключения в двух клиентах.
- `whisper-transparent-v2.png` — Мобильная: data/creatures.json.
- `whisper.png` — Нет подключения в двух клиентах.

### `mobile/content/generated/art/creatures/portraits`

- `skeleton-v1.png` — Мобильная: data/creatures.json.
- `skeleton-archer-v1.png` — Мобильная: data/creatures.json.

- `ash-hound.png` — Мобильная: data/creatures.json.
- `attractor-v1.png` — Мобильная: data/creatures.json.
- `battle-mage.png` — Мобильная: data/creatures.json.
- `bog-bell.png` — Мобильная: data/creatures.json.
- `bone-collector.png` — Мобильная: data/creatures.json.
- `cat.png` — Мобильная: data/creatures.json.
- `dark-faerie.png` — Мобильная: data/creatures.json.
- `demon.png` — Мобильная: data/creatures.json.
- `dog.png` — Мобильная: data/creatures.json.
- `dragon.png` — Мобильная: data/creatures.json.
- `elf.png` — Мобильная: data/creatures.json.
- `faerie.png` — Мобильная: data/creatures.json.
- `faun.png` — Мобильная: data/creatures.json.
- `flying-lizard.png` — Мобильная: data/creatures.json.
- `flying-snake.png` — Мобильная: data/creatures.json.
- `giant-snake.png` — Мобильная: data/creatures.json.
- `harpy.png` — Мобильная: data/creatures.json.
- `huge-cat.png` — Мобильная: data/creatures.json.
- `huge-wolf.png` — Мобильная: data/creatures.json.
- `lake-snake.png` — Мобильная: data/creatures.json.
- `large-bird.png` — Мобильная: data/creatures.json.
- `leshy.png` — Мобильная: data/creatures.json.
- `light-spirit.png` — Мобильная: data/creatures.json.
- `living-armor.png` — Мобильная: data/creatures.json.
- `meldling.png` — Мобильная: data/creatures.json.
- `mirror-being.png` — Мобильная: data/creatures.json.
- `octopus.png` — Мобильная: data/creatures.json.
- `root-shepherd.png` — Мобильная: data/creatures.json.
- `rust-eater.png` — Мобильная: data/creatures.json.
- `small-bird.png` — Мобильная: data/creatures.json.
- `stitchling.png` — Мобильная: data/creatures.json.
- `stone-yawn.png` — Мобильная: data/creatures.json.
- `swamp-hag.png` — Мобильная: data/creatures.json.
- `vampire.png` — Мобильная: data/creatures.json.
- `vanishing.png` — Мобильная: data/creatures.json.
- `werewolf.png` — Мобильная: data/creatures.json.
- `whisperess.png` — Мобильная: data/creatures.json.
- `wild-mage.png` — Мобильная: data/creatures.json.
- `wolf.png` — Мобильная: data/creatures.json.

### `mobile/content/generated/art/items`

- `ash-mantle-transparent-v2.png` — Мобильная: data/item-art.json.
- `ash-mantle.png` — Нет подключения в двух клиентах.
- `axe-transparent-v2.png` — Мобильная: data/item-art.json.
- `axe.png` — Нет подключения в двух клиентах.
- `bandit-cleaver-transparent-v2.png` — Мобильная: data/item-art.json.
- `bandit-cleaver.png` — Нет подключения в двух клиентах.
- `beaked-hammer-transparent-v2.png` — Мобильная: data/item-art.json.
- `beaked-hammer.png` — Нет подключения в двух клиентах.
- `bitter-censer-transparent-v2.png` — Мобильная: data/item-art.json.
- `bitter-censer.png` — Нет подключения в двух клиентах.
- `bitter-spore-staff-transparent-v2.png` — Мобильная: data/item-art.json.
- `bitter-spore-staff.png` — Нет подключения в двух клиентах.
- `bog-stinger-transparent-v2.png` — Мобильная: data/item-art.json.
- `bog-stinger.png` — Нет подключения в двух клиентах.
- `buckler-transparent-v2.png` — Мобильная: data/item-art.json.
- `buckler.png` — Нет подключения в двух клиентах.
- `chainmail-transparent-v2.png` — Мобильная: data/item-art.json.
- `chainmail.png` — Нет подключения в двух клиентах.
- `clay-circle-staff-transparent-v2.png` — Мобильная: data/item-art.json.
- `clay-circle-staff.png` — Нет подключения в двух клиентах.
- `club-transparent-v2.png` — Мобильная: data/item-art.json.
- `club.png` — Нет подключения в двух клиентах.
- `convoy-blade-transparent-v2.png` — Мобильная: data/item-art.json.
- `convoy-blade.png` — Нет подключения в двух клиентах.
- `dagger-transparent-v2.png` — Мобильная: data/item-art.json.
- `dagger.png` — Нет подключения в двух клиентах.
- `dustglass-wand-transparent-v2.png` — Мобильная: data/item-art.json.
- `dustglass-wand.png` — Нет подключения в двух клиентах.
- `elven-moon-sickle-transparent-v2.png` — Мобильная: data/item-art.json.
- `elven-moon-sickle.png` — Нет подключения в двух клиентах.
- `ember-sword-transparent-v2.png` — Мобильная: data/item-art.json.
- `ember-sword.png` — Нет подключения в двух клиентах.
- `emberstone-staff-transparent-v2.png` — Мобильная: data/item-art.json.
- `emberstone-staff.png` — Нет подключения в двух клиентах.
- `ephemeral-sword-transparent-v2.png` — Мобильная: data/item-art.json.
- `ephemeral-sword.png` — Нет подключения в двух клиентах.
- `faun-boar-spear-transparent-v2.png` — Мобильная: data/item-art.json.
- `faun-boar-spear.png` — Нет подключения в двух клиентах.
- `ferry-espadon-transparent-v2.png` — Мобильная: data/item-art.json.
- `ferry-espadon.png` — Нет подключения в двух клиентах.
- `fist-transparent-v2.png` — Мобильная: data/base-figures.json, data/item-art.json.
- `fist.png` — Нет подключения в двух клиентах.
- `fold-amulet-transparent-v2.png` — Мобильная: data/item-art.json.
- `fold-amulet.png` — Нет подключения в двух клиентах.
- `frost-dagger-transparent-v2.png` — Мобильная: data/item-art.json.
- `frost-dagger.png` — Нет подключения в двух клиентах.
- `glassfurnace-hammer-transparent-v2.png` — Мобильная: data/item-art.json.
- `glassfurnace-hammer.png` — Нет подключения в двух клиентах.
- `greatsword-transparent-v2.png` — Мобильная: data/item-art.json.
- `greatsword.png` — Нет подключения в двух клиентах.
- `greaves-transparent-v2.png` — Мобильная: data/armor.json, data/item-art.json.
- `greaves.png` — Нет подключения в двух клиентах.
- `guest-blade-transparent-v2.png` — Мобильная: data/item-art.json.
- `guest-blade.png` — Нет подключения в двух клиентах.
- `hammer-transparent-v2.png` — Мобильная: data/item-art.json.
- `hammer.png` — Нет подключения в двух клиентах.
- `hollow-tuning-fork-transparent-v2.png` — Мобильная: data/item-art.json.
- `hollow-tuning-fork.png` — Нет подключения в двух клиентах.
- `hunting-bow-transparent-v2.png` — Мобильная: data/item-art.json.
- `hunting-bow.png` — Нет подключения в двух клиентах.
- `iron-boots-transparent-v2.png` — Мобильная: data/armor.json, data/item-art.json.
- `iron-boots.png` — Нет подключения в двух клиентах.
- `kite-shield-transparent-v2.png` — Мобильная: data/item-art.json.
- `kite-shield.png` — Нет подключения в двух клиентах.
- `last-watch-halberd-transparent-v2.png` — Мобильная: data/item-art.json.
- `last-watch-halberd.png` — Нет подключения в двух клиентах.
- `leather-transparent-v2.png` — Мобильная: data/item-art.json.
- `leather.png` — Нет подключения в двух клиентах.
- `marsh-hook-transparent-v2.png` — Мобильная: data/item-art.json.
- `marsh-hook.png` — Нет подключения в двух клиентах.
- `mirror-shield-transparent-v2.png` — Мобильная: data/item-art.json.
- `mirror-shield.png` — Нет подключения в двух клиентах.
- `outpost-crossbow-transparent-v2.png` — Мобильная: data/item-art.json.
- `outpost-crossbow.png` — Нет подключения в двух клиентах.
- `plate-transparent-v2.png` — Мобильная: data/item-art.json.
- `plate.png` — Нет подключения в двух клиентах.
- `rags-transparent-v2.png` — Мобильная: data/item-art.json.
- `rags.png` — Нет подключения в двух клиентах.
- `rapier-transparent-v2.png` — Мобильная: data/item-art.json.
- `rapier.png` — Нет подключения в двух клиентах.
- `river-ice-wand-transparent-v2.png` — Мобильная: data/item-art.json.
- `river-ice-wand.png` — Нет подключения в двух клиентах.
- `road-sword-transparent-v2.png` — Мобильная: data/item-art.json.
- `road-sword.png` — Нет подключения в двух клиентах.
- `robe-transparent-v2.png` — Мобильная: data/item-art.json.
- `robe.png` — Нет подключения в двух клиентах.
- `ropewalk-chain-knife-transparent-v2.png` — Мобильная: data/item-art.json.
- `ropewalk-chain-knife.png` — Нет подключения в двух клиентах.
- `sealed-stone-sling-transparent-v2.png` — Мобильная: data/item-art.json.
- `sealed-stone-sling.png` — Нет подключения в двух клиентах.
- `shortsword-transparent-v2.png` — Мобильная: data/item-art.json.
- `shortsword.png` — Нет подключения в двух клиентах.
- `sinew-lash-transparent-v2.png` — Мобильная: data/item-art.json.
- `sinew-lash.png` — Нет подключения в двух клиентах.
- `soldier-spear-transparent-v2.png` — Мобильная: data/item-art.json.
- `soldier-spear.png` — Нет подключения в двух клиентах.
- `spark-lantern-transparent-v2.png` — Мобильная: data/item-art.json.
- `spark-lantern.png` — Нет подключения в двух клиентах.
- `spear-transparent-v2.png` — Мобильная: data/item-art.json.
- `spear.png` — Нет подключения в двух клиентах.
- `staff-transparent-v2.png` — Мобильная: data/item-art.json.
- `staff.png` — Нет подключения в двух клиентах.
- `stonecrusher-transparent-v2.png` — Мобильная: data/item-art.json.
- `stonecrusher.png` — Нет подключения в двух клиентах.
- `tailwind-spear-transparent-v2.png` — Мобильная: data/item-art.json.
- `tailwind-spear.png` — Нет подключения в двух клиентах.
- `unlock-ring-transparent-v2.png` — Мобильная: data/item-art.json.
- `unlock-ring.png` — Нет подключения в двух клиентах.
- `wanderer-boots-transparent-v2.png` — Мобильная: data/armor.json, data/item-art.json.
- `wanderer-boots.png` — Нет подключения в двух клиентах.
- `wind-sickle-transparent-v2.png` — Мобильная: data/item-art.json.
- `wind-sickle.png` — Нет подключения в двух клиентах.
- `winter-shard-transparent-v2.png` — Мобильная: data/item-art.json.
- `winter-shard.png` — Нет подключения в двух клиентах.

### `mobile/content/generated/art/portraits`

- `character-01-ash.png` — Мобильная: data/portraits.json.
- `character-02-earth.png` — Мобильная: data/portraits.json.
- `character-03-ivory.png` — Мобильная: data/portraits.json.
- `character-04-copper.png` — Мобильная: data/portraits.json.
- `character-05-mist.png` — Мобильная: data/portraits.json.
- `character-06-flint.png` — Мобильная: data/portraits.json.
- `character-07-amber.png` — Мобильная: data/portraits.json.
- `character-08-raven.png` — Мобильная: data/portraits.json.
- `character-09-frost.png` — Мобильная: data/portraits.json.
- `character-10-ochre.png` — Мобильная: data/portraits.json.
- `character-11-ember.png` — Мобильная: data/portraits.json.
- `character-12-willow.png` — Мобильная: data/portraits.json.
- `character-13-storm.png` — Мобильная: data/portraits.json.
- `character-14-sand.png` — Мобильная: data/portraits.json.
- `character-15-slate.png` — Мобильная: data/portraits.json.
- `character-16-silver.png` — Мобильная: data/portraits.json.
- `character-17-heather.png` — Мобильная: data/portraits.json.
- `character-18-bronze.png` — Мобильная: data/portraits.json.
- `character-19-night.png` — Мобильная: data/portraits.json.
- `character-20-dawn.png` — Мобильная: data/portraits.json.
- `character-21-reed.png` — Мобильная: data/portraits.json.
- `character-22-pine.png` — Мобильная: data/portraits.json.
- `character-23-clay.png` — Мобильная: data/portraits.json.
- `character-24-steppe.png` — Мобильная: data/portraits.json.
- `character-25-saffron.png` — Мобильная: data/portraits.json.
- `character-26-basalt.png` — Мобильная: data/portraits.json.
- `character-27-cinder.png` — Мобильная: data/portraits.json.
- `character-28-cypress.png` — Мобильная: data/portraits.json.
- `character-29-thorn.png` — Мобильная: data/portraits.json.
- `character-30-flax.png` — Мобильная: data/portraits.json.
- `character-31-moss.png` — Мобильная: data/portraits.json.
- `character-32-quartz.png` — Мобильная: data/portraits.json.
- `character-33-umber.png` — Мобильная: data/portraits.json.
- `character-34-silt.png` — Мобильная: data/portraits.json.
- `character-35-lichen.png` — Мобильная: data/portraits.json.

### `mobile/content/generated/art/skills`

- `attack-training-transparent-v2.png` — Мобильная: data/skills.json.
- `bandage-transparent-v2.png` — Мобильная: data/skills.json.
- `bandage-v1.png` — Нет подключения в двух клиентах.
- `composure-v1.png` — Нет подключения в двух клиентах.
- `defense-training-transparent-v2.png` — Мобильная: data/skills.json.
- `dodge-transparent-v2.png` — Мобильная: data/skills.json.
- `dodge-v1.png` — Нет подключения в двух клиентах.
- `parry-transparent-v2.png` — Мобильная: data/skills.json.
- `sidestep-transparent-v2.png` — Мобильная: data/skills.json.
- `sidestep-v1.png` — Нет подключения в двух клиентах.

### `mobile/content/generated/art/terrain`

- `grass.png` — Нет подключения в двух клиентах.

### `mobile/content/generated/art/ui`

- `equipment-silhouette-neutral.png` — Нет подключения в двух клиентах.
- `gothic-frame.png` — Мобильная: mobile/ui/texture_frame.gd, mobile/ui/textured_divider.gd.
- `item-card-leather-v1.png` — Нет подключения в двух клиентах.
- `logos-shards-v3.png` — Мобильная: mobile/ui/shard_counter.gd.
- `portrait-frame-round-v1.png` — Мобильная: mobile/ui/game_header.gd.
- `portrait-frame-v1.png` — Мобильная: mobile/ui/character_overview.gd.
- `start-landscape-v1.png` — Мобильная: mobile/ui/character_window.gd, mobile/ui/main.gd.

### `mobile/content/generated/art/ui/battle-modes`

- `expendable-v1.png` — Мобильная: mobile/ui/game_header.gd.
- `free-v1.png` — Мобильная: mobile/ui/game_header.gd.

### `mobile/content/generated/art/ui/journey`

- `battle-v1.png` — Мобильная: mobile/ui/journey_map.gd.
- `camp-v1.png` — Мобильная: mobile/ui/journey_map.gd.
- `champion-v1.png` — Мобильная: mobile/ui/journey_map.gd.
- `forge-v1.png` — Мобильная: mobile/ui/journey_map.gd.

### `mobile/content/generated/art/ui/journey/maps`

- `forest-battle-v1.png` — Мобильная: data/journey-maps.json.
- `forest-v3.png` — Мобильная: data/journey-maps.json.
- `ruins-battle-v1.png` — Мобильная: data/journey-maps.json.
- `ruins-v3.png` — Мобильная: data/journey-maps.json.
- `steppe-battle-v1.png` — Мобильная: data/journey-maps.json.
- `steppe-v3.png` — Мобильная: data/journey-maps.json.

### `mobile/content/ui`

- `board-tile-v1.png` — Мобильная: mobile/ui/figure_art.gd, mobile/ui/reward_grid.gd.
- `board-v2.png` — Мобильная: mobile/ui/board.gd.
- `button-slate-v1.png` — Мобильная: mobile/ui/gothic_theme.gd.
- `button-square-pressed-v1.png` — Мобильная: mobile/ui/square_button.gd.
- `button-square-v1.png` — Мобильная: mobile/ui/square_button.gd.
- `cell-contested-v2.png` — Мобильная: mobile/ui/board.gd.
- `cell-enemy-v2.png` — Мобильная: mobile/ui/board.gd.
- `cell-player-v2.png` — Мобильная: mobile/ui/board.gd.
- `character-slate-v1.png` — Мобильная: mobile/ui/character_surface.gd.
- `equipment-mannequin-v2.png` — Мобильная: mobile/ui/character_equipment.gd.
- `guard-v1.png` — Нет подключения в двух клиентах.

### `public`

- `favicon.svg` — Браузер: index.html; Мобильная: mobile/project.godot → sync_content.py (icon.svg).

### `public/actions`

- `guard-transparent-v2.png` — Браузер: data/base-figures.json; Мобильная: data/base-figures.json.
- `kick-transparent-v2.png` — Браузер: data/base-figures.json; Мобильная: data/base-figures.json.
- `kick.png` — Нет подключения в двух клиентах.

### `public/creatures/actions`

- `ash-transparent-v2.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `ash.png` — Нет подключения в двух клиентах.
- `bite-transparent-v2.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `bite.png` — Нет подключения в двух клиентах.
- `claw-transparent-v2.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `claw.png` — Нет подключения в двух клиентах.
- `constrict-transparent-v2.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `constrict.png` — Нет подключения в двух клиентах.
- `evade-transparent-v2.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `evade.png` — Нет подключения в двух клиентах.
- `horn-transparent-v2.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `horn.png` — Нет подключения в двух клиентах.
- `magic-transparent-v2.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `magic.png` — Нет подключения в двух клиентах.
- `mind-transparent-v2.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `mind.png` — Нет подключения в двух клиентах.
- `mirror-transparent-v2.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `mirror.png` — Нет подключения в двух клиентах.
- `poison-transparent-v2.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `poison.png` — Нет подключения в двух клиентах.
- `recover.png` — Нет подключения в двух клиентах.
- `rest.png` — Нет подключения в двух клиентах.
- `root-transparent-v2.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `root.png` — Нет подключения в двух клиентах.
- `slam-transparent-v2.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `slam.png` — Нет подключения в двух клиентах.
- `spores-transparent-v2.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `spores.png` — Нет подключения в двух клиентах.
- `talon-transparent-v2.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `talon.png` — Нет подключения в двух клиентах.
- `tentacle-transparent-v2.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `tentacle.png` — Нет подключения в двух клиентах.
- `veil-transparent-v2.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `veil.png` — Нет подключения в двух клиентах.
- `ward-transparent-v2.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `ward.png` — Нет подключения в двух клиентах.
- `whisper-transparent-v2.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `whisper.png` — Нет подключения в двух клиентах.

### `public/creatures/portraits`

- `skeleton-v1.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `skeleton-archer-v1.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.

- `ash-hound.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `attractor-v1.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `battle-mage.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `bog-bell.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `bone-collector.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `cat.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `dark-faerie.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `demon.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `dog.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `dragon.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `elf.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `faerie.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `faun.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `flying-lizard.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `flying-snake.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `giant-snake.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `harpy.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `huge-cat.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `huge-wolf.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `lake-snake.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `large-bird.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `leshy.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `light-spirit.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `living-armor.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `meldling.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `mirror-being.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `octopus.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `root-shepherd.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `rust-eater.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `small-bird.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `stitchling.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `stone-yawn.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `swamp-hag.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `vampire.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `vanishing.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `werewolf.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `whisperess.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `wild-mage.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json.
- `wolf.png` — Браузер: data/creatures.json; Мобильная: data/creatures.json; Вспомогательные ссылки: stories/wolf-prototypes/DeckWolfPrototype.tsx, stories/wolf-prototypes/WolfPrototype.tsx.

### `public/items`

- `ash-mantle-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `ash-mantle.png` — Нет подключения в двух клиентах.
- `axe-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `axe.png` — Нет подключения в двух клиентах.
- `bandit-cleaver-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `bandit-cleaver.png` — Нет подключения в двух клиентах.
- `beaked-hammer-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `beaked-hammer.png` — Нет подключения в двух клиентах.
- `bitter-censer-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `bitter-censer.png` — Нет подключения в двух клиентах.
- `bitter-spore-staff-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `bitter-spore-staff.png` — Нет подключения в двух клиентах.
- `bog-stinger-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `bog-stinger.png` — Нет подключения в двух клиентах.
- `buckler-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `buckler.png` — Нет подключения в двух клиентах.
- `chainmail-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `chainmail.png` — Нет подключения в двух клиентах.
- `clay-circle-staff-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `clay-circle-staff.png` — Нет подключения в двух клиентах.
- `club-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `club.png` — Нет подключения в двух клиентах.
- `convoy-blade-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `convoy-blade.png` — Нет подключения в двух клиентах.
- `dagger-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `dagger.png` — Нет подключения в двух клиентах; Вспомогательные ссылки: tests/transparent-art.test.ts.
- `dustglass-wand-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `dustglass-wand.png` — Нет подключения в двух клиентах.
- `elven-moon-sickle-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `elven-moon-sickle.png` — Нет подключения в двух клиентах.
- `ember-sword-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `ember-sword.png` — Нет подключения в двух клиентах.
- `emberstone-staff-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `emberstone-staff.png` — Нет подключения в двух клиентах.
- `ephemeral-sword-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `ephemeral-sword.png` — Нет подключения в двух клиентах.
- `faun-boar-spear-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `faun-boar-spear.png` — Нет подключения в двух клиентах.
- `ferry-espadon-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `ferry-espadon.png` — Нет подключения в двух клиентах.
- `fist-transparent-v2.png` — Браузер: data/base-figures.json, data/item-art.json; Мобильная: data/base-figures.json, data/item-art.json.
- `fist.png` — Нет подключения в двух клиентах; Вспомогательные ссылки: tests/transparent-art.test.ts.
- `fold-amulet-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `fold-amulet.png` — Нет подключения в двух клиентах.
- `frost-dagger-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `frost-dagger.png` — Нет подключения в двух клиентах.
- `glassfurnace-hammer-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `glassfurnace-hammer.png` — Нет подключения в двух клиентах.
- `greatsword-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `greatsword.png` — Нет подключения в двух клиентах.
- `greaves-transparent-v2.png` — Браузер: data/armor.json, data/item-art.json; Мобильная: data/armor.json, data/item-art.json.
- `greaves.png` — Нет подключения в двух клиентах.
- `guest-blade-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `guest-blade.png` — Нет подключения в двух клиентах.
- `hammer-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `hammer.png` — Нет подключения в двух клиентах.
- `hollow-tuning-fork-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `hollow-tuning-fork.png` — Нет подключения в двух клиентах.
- `hunting-bow-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `hunting-bow.png` — Нет подключения в двух клиентах.
- `iron-boots-transparent-v2.png` — Браузер: data/armor.json, data/item-art.json; Мобильная: data/armor.json, data/item-art.json.
- `iron-boots.png` — Нет подключения в двух клиентах.
- `kite-shield-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `kite-shield.png` — Нет подключения в двух клиентах.
- `last-watch-halberd-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `last-watch-halberd.png` — Нет подключения в двух клиентах.
- `leather-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `leather.png` — Нет подключения в двух клиентах.
- `marsh-hook-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `marsh-hook.png` — Нет подключения в двух клиентах.
- `mirror-shield-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `mirror-shield.png` — Нет подключения в двух клиентах.
- `outpost-crossbow-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `outpost-crossbow.png` — Нет подключения в двух клиентах.
- `plate-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `plate.png` — Нет подключения в двух клиентах.
- `rags-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `rags.png` — Нет подключения в двух клиентах.
- `rapier-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `rapier.png` — Нет подключения в двух клиентах.
- `river-ice-wand-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `river-ice-wand.png` — Нет подключения в двух клиентах.
- `road-sword-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `road-sword.png` — Нет подключения в двух клиентах.
- `robe-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `robe.png` — Нет подключения в двух клиентах.
- `ropewalk-chain-knife-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `ropewalk-chain-knife.png` — Нет подключения в двух клиентах.
- `sealed-stone-sling-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `sealed-stone-sling.png` — Нет подключения в двух клиентах.
- `shortsword-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `shortsword.png` — Нет подключения в двух клиентах.
- `sinew-lash-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `sinew-lash.png` — Нет подключения в двух клиентах.
- `soldier-spear-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `soldier-spear.png` — Нет подключения в двух клиентах.
- `spark-lantern-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `spark-lantern.png` — Нет подключения в двух клиентах.
- `spear-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `spear.png` — Нет подключения в двух клиентах.
- `staff-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `staff.png` — Нет подключения в двух клиентах.
- `stonecrusher-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `stonecrusher.png` — Нет подключения в двух клиентах.
- `tailwind-spear-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `tailwind-spear.png` — Нет подключения в двух клиентах.
- `unlock-ring-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `unlock-ring.png` — Нет подключения в двух клиентах.
- `wanderer-boots-transparent-v2.png` — Браузер: data/armor.json, data/item-art.json; Мобильная: data/armor.json, data/item-art.json.
- `wanderer-boots.png` — Нет подключения в двух клиентах.
- `wind-sickle-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `wind-sickle.png` — Нет подключения в двух клиентах.
- `winter-shard-transparent-v2.png` — Браузер: data/item-art.json; Мобильная: data/item-art.json.
- `winter-shard.png` — Нет подключения в двух клиентах.

### `public/portraits`

- `character-01-ash.png` — Браузер: data/portraits.json; Мобильная: data/portraits.json.
- `character-02-earth.png` — Браузер: data/portraits.json; Мобильная: data/portraits.json.
- `character-03-ivory.png` — Браузер: data/portraits.json; Мобильная: data/portraits.json.
- `character-04-copper.png` — Браузер: data/portraits.json; Мобильная: data/portraits.json.
- `character-05-mist.png` — Браузер: data/portraits.json; Мобильная: data/portraits.json.
- `character-06-flint.png` — Браузер: data/portraits.json; Мобильная: data/portraits.json.
- `character-07-amber.png` — Браузер: data/portraits.json; Мобильная: data/portraits.json.
- `character-08-raven.png` — Браузер: data/portraits.json; Мобильная: data/portraits.json.
- `character-09-frost.png` — Браузер: data/portraits.json; Мобильная: data/portraits.json.
- `character-10-ochre.png` — Браузер: data/portraits.json; Мобильная: data/portraits.json.
- `character-11-ember.png` — Браузер: data/portraits.json; Мобильная: data/portraits.json.
- `character-12-willow.png` — Браузер: data/portraits.json; Мобильная: data/portraits.json.
- `character-13-storm.png` — Браузер: data/portraits.json; Мобильная: data/portraits.json.
- `character-14-sand.png` — Браузер: data/portraits.json; Мобильная: data/portraits.json.
- `character-15-slate.png` — Браузер: data/portraits.json; Мобильная: data/portraits.json.
- `character-16-silver.png` — Браузер: data/portraits.json; Мобильная: data/portraits.json.
- `character-17-heather.png` — Браузер: data/portraits.json; Мобильная: data/portraits.json.
- `character-18-bronze.png` — Браузер: data/portraits.json; Мобильная: data/portraits.json.
- `character-19-night.png` — Браузер: data/portraits.json; Мобильная: data/portraits.json.
- `character-20-dawn.png` — Браузер: data/portraits.json; Мобильная: data/portraits.json.
- `character-21-reed.png` — Браузер: data/portraits.json; Мобильная: data/portraits.json.
- `character-22-pine.png` — Браузер: data/portraits.json; Мобильная: data/portraits.json.
- `character-23-clay.png` — Браузер: data/portraits.json; Мобильная: data/portraits.json.
- `character-24-steppe.png` — Браузер: data/portraits.json; Мобильная: data/portraits.json.
- `character-25-saffron.png` — Браузер: data/portraits.json; Мобильная: data/portraits.json.
- `character-26-basalt.png` — Браузер: data/portraits.json; Мобильная: data/portraits.json.
- `character-27-cinder.png` — Браузер: data/portraits.json; Мобильная: data/portraits.json.
- `character-28-cypress.png` — Браузер: data/portraits.json; Мобильная: data/portraits.json.
- `character-29-thorn.png` — Браузер: data/portraits.json; Мобильная: data/portraits.json.
- `character-30-flax.png` — Браузер: data/portraits.json; Мобильная: data/portraits.json.
- `character-31-moss.png` — Браузер: data/portraits.json; Мобильная: data/portraits.json.
- `character-32-quartz.png` — Браузер: data/portraits.json; Мобильная: data/portraits.json.
- `character-33-umber.png` — Браузер: data/portraits.json; Мобильная: data/portraits.json.
- `character-34-silt.png` — Браузер: data/portraits.json; Мобильная: data/portraits.json.
- `character-35-lichen.png` — Браузер: data/portraits.json; Мобильная: data/portraits.json.

### `public/skills`

- `attack-training-transparent-v2.png` — Браузер: data/skills.json; Мобильная: data/skills.json.
- `bandage-transparent-v2.png` — Браузер: data/skills.json; Мобильная: data/skills.json.
- `bandage-v1.png` — Нет подключения в двух клиентах.
- `composure-v1.png` — Нет подключения в двух клиентах.
- `defense-training-transparent-v2.png` — Браузер: data/skills.json; Мобильная: data/skills.json.
- `dodge-transparent-v2.png` — Браузер: data/skills.json; Мобильная: data/skills.json.
- `dodge-v1.png` — Нет подключения в двух клиентах.
- `parry-transparent-v2.png` — Браузер: data/skills.json; Мобильная: data/skills.json.
- `sidestep-transparent-v2.png` — Браузер: data/skills.json; Мобильная: data/skills.json.
- `sidestep-v1.png` — Нет подключения в двух клиентах.

### `public/terrain`

- `grass.png` — Браузер: src/features/combat/ReactionBoard/ReactionBoard.css; Вспомогательные ссылки: tests/transparent-art-preview.html.
- `rock-horizontal.png` — Браузер: src/game/combat/terrain.ts (камни отключены: rockChance=0).
- `rock-vertical.png` — Браузер: src/game/combat/terrain.ts (камни отключены: rockChance=0).
- `rock.png` — Браузер: src/features/combat/ReactionBoard/ReactionBoard.css, src/game/combat/terrain.ts (камни отключены: rockChance=0).

### `public/ui`

- `character-card-frame-v1.png` — Нет подключения в двух клиентах.
- `character-card-tabs-v1.png` — Браузер: src/features/characters/CharacterCard/CharacterCard.css.
- `equipment-silhouette-neutral.png` — Браузер: src/features/equipment/EquipmentDoll/EquipmentDoll.tsx.
- `equipment-silhouette.png` — Нет подключения в двух клиентах.
- `gothic-frame.png` — Браузер: src/app/styles/style.css, src/features/combat/BattleHeader/BattleHeader.css, src/shared/ui/ItemIcon/ItemIcon.css; Мобильная: mobile/ui/texture_frame.gd, mobile/ui/textured_divider.gd.
- `item-card-leather-v1.png` — Нет подключения в двух клиентах.
- `item-grain-v2.svg` — Браузер: src/features/equipment/ItemInspection/ItemCard.css.
- `item-patina-v2.svg` — Браузер: src/features/equipment/ItemInspection/ItemCard.css.
- `item-scuffs-v2.svg` — Браузер: src/features/equipment/ItemInspection/ItemCard.css.
- `logos-shard-v1.png` — Нет подключения в двух клиентах.
- `logos-shards-v2.png` — Нет подключения в двух клиентах.
- `logos-shards-v3.png` — Мобильная: mobile/ui/shard_counter.gd.
- `modal-body-v1.png` — Браузер: src/features/characters/CharacterCard/CharacterCard.css, src/features/characters/CharacterCreation/CharacterCreation.css, src/features/skills/FighterSkills/FighterSkills.css, src/shared/ui/Modal/Modal.css.
- `modal-header-v1.png` — Нет подключения в двух клиентах.
- `modal-header-v2.png` — Браузер: src/features/characters/CharacterCreation/CharacterCreation.css, src/features/combat/BattleHeader/BattleHeader.css, src/shared/ui/Modal/Modal.css.
- `portrait-death-skull-enemy-v1.png` — Браузер: src/shared/ui/CharacterPortrait/CharacterPortrait.tsx.
- `portrait-death-skull-v1.png` — Браузер: src/shared/ui/CharacterPortrait/CharacterPortrait.tsx.
- `portrait-frame-round-v1.png` — Браузер: src/shared/ui/CharacterPortrait/CharacterPortrait.css; Мобильная: mobile/ui/game_header.gd.
- `portrait-frame-v1.png` — Браузер: src/app/styles/style.css; Мобильная: mobile/ui/character_overview.gd.
- `soul-wisp-v1.png` — Браузер: src/features/characters/SoulBalance/model.ts.
- `start-landscape-v1.png` — Браузер: src/features/characters/CharacterCreation/CharacterCreation.tsx, src/features/characters/CharacterHome/CharacterHome.tsx, src/features/home/StartScreen/StartScreen.tsx; Мобильная: mobile/ui/character_window.gd, mobile/ui/main.gd.
- `text-button-v1.png` — Браузер: src/shared/ui/GothicTextButton/GothicTextButton.css.
- `text-input-v1.png` — Браузер: src/features/characters/CharacterCreation/CharacterCreation.css.

### `public/ui/battle-modes`

- `expendable-v1.png` — Браузер: src/features/combat/BattleModeArtwork/model.ts; Мобильная: mobile/ui/game_header.gd.
- `free-v1.png` — Браузер: src/features/combat/BattleModeArtwork/model.ts; Мобильная: mobile/ui/game_header.gd.
- `limited-v1.png` — Нет подключения в двух клиентах.

### `public/ui/journey`

- `battle-v1.png` — Браузер: src/features/journey/JourneyMap/model.ts → JourneyNodeIcon; Мобильная: mobile/ui/journey_map.gd.
- `camp-v1.png` — Браузер: src/features/journey/JourneyMap/model.ts → JourneyNodeIcon; Мобильная: mobile/ui/journey_map.gd.
- `champion-v1.png` — Браузер: src/features/journey/JourneyMap/model.ts → JourneyNodeIcon; Мобильная: mobile/ui/journey_map.gd.
- `forge-v1.png` — Браузер: src/features/journey/JourneyMap/model.ts → JourneyNodeIcon; Мобильная: mobile/ui/journey_map.gd.

### `public/ui/journey/maps`

- `forest-battle-v1.png` — Браузер: data/journey-maps.json; Мобильная: data/journey-maps.json.
- `forest-v3.png` — Браузер: data/journey-maps.json; Мобильная: data/journey-maps.json.
- `ruins-battle-v1.png` — Браузер: data/journey-maps.json; Мобильная: data/journey-maps.json.
- `ruins-v3.png` — Браузер: data/journey-maps.json; Мобильная: data/journey-maps.json.
- `steppe-battle-v1.png` — Браузер: data/journey-maps.json; Мобильная: data/journey-maps.json.
- `steppe-v3.png` — Браузер: data/journey-maps.json; Мобильная: data/journey-maps.json.

### `browser/public/ui/navigation`

- `close-v1.png` — Нет подключения в двух клиентах.
- `close-v2.png` — Браузер: src/shared/ui/GothicIcon/model.ts → GothicIcon.tsx.
- `grave-v1.png` — Браузер: src/shared/ui/GothicIcon/model.ts → GothicIcon.tsx.
- `left-v1.png` — Браузер: src/shared/ui/GothicIcon/model.ts → GothicIcon.tsx.
- `menu-v1.png` — Браузер: src/shared/ui/GothicIcon/model.ts → GothicIcon.tsx.
- `minus-v1.png` — Браузер: src/shared/ui/GothicIcon/model.ts → GothicIcon.tsx.
- `plus-v1.png` — Браузер: src/shared/ui/GothicIcon/model.ts → GothicIcon.tsx.
- `right-v1.png` — Нет подключения в двух клиентах.
- `right-v2.png` — Браузер: src/shared/ui/GothicIcon/model.ts → GothicIcon.tsx.

### `refs`

- `image1.png` — Нет подключения в двух клиентах.
- `image2.png` — Нет подключения в двух клиентах.
- `image3.png` — Нет подключения в двух клиентах.

## Организация материалов генерации

Папка `assets/` переименована в `art-prompts/`: здесь остались текстовые запросы и история генерации. Единственный исполняемый инструмент перенесён в `browser/scripts/generate-item-textures.py` и принимает обязательный параметр `--out`. Эталоны остаются в `refs/`, игровые изображения — в `public/`. Количество изображений от этого переноса не изменилось. Старые пути выше в записи очистки оставлены как исторические.

## Именные персонажи сценария — 2026-09-27

Семь новых портретов внесены в `data/story-characters.json` и показаны в [CHARACTERS.md](CHARACTERS.md). Каталог пока не читается игровыми клиентами; эти изображения подготовлены для сюжетного интерфейса. Портреты героя не изменялись.

- `public/characters/sevran-v1.png` — `sevran`, PNG 1024 × 1536, разворот влево.
- `public/characters/marta-v1.png` — `marta`, PNG 1024 × 1536, разворот влево.
- `public/characters/elian-v1.png` — `elian`, PNG 1024 × 1536, разворот влево.
- `public/characters/thea-v1.png` — `thea`, PNG 1024 × 1536, разворот влево.
- `public/characters/nima-v1.png` — `nima`, PNG 1024 × 1536, разворот влево.
- `public/characters/veyr-v1.png` — `veyr`, PNG 1024 × 1536, разворот влево.
- `public/characters/asta-v1.png` — `asta`, PNG 1024 × 1536, разворот влево.

## Эпизодические портреты — 2026-09-27

25 новых PNG зарегистрированы в `data/story-characters.json` и связаны с говорящими в `data/story.json`. Подготовлены для будущего сюжетного интерфейса; к игровым клиентам пока не подключены и в мобильную сборку не копируются. Превью и роли — [CHARACTERS.md](CHARACTERS.md).

- `public/characters/convoy-driver-v1.png` — Возница, 1024 × 1536, разворот влево.
- `public/characters/convoy-bandit-v1.png` — Разбойник — пленник обоза, 1024 × 1536, разворот влево.
- `public/characters/bridge-mercenary-v1.png` — Наёмник у моста, 1024 × 1536, разворот влево.
- `public/characters/bridge-woman-v1.png` — Женщина у двери, 1024 × 1536, разворот влево.
- `public/characters/city-raider-v1.png` — Городской вымогатель, 1024 × 1536, разворот влево.
- `public/characters/city-watch-v1.png` — Городской дозорный, 1024 × 1536, разворот влево.
- `public/characters/city-priestess-v1.png` — Жрица приёмного дома, 1024 × 1536, разворот влево.
- `public/characters/grain-mercenary-v1.png` — Наёмник у зерна, 1024 × 1536, разворот влево.
- `public/characters/city-trader-v1.png` — Торговка, 1024 × 1536, разворот влево.
- `public/characters/city-buyer-v1.png` — Скупщик, 1024 × 1536, разворот влево.
- `public/characters/inn-bodyguard-v1.png` — Телохранитель гостиницы, 1024 × 1536, разворот влево.
- `public/characters/innkeeper-mask-v1.png` — Хозяин гостиницы, 1024 × 1536, разворот влево.
- `public/characters/inn-servant-v1.png` — Слуга гостиницы, 1024 × 1536, разворот влево.
- `public/characters/inn-prisoner-v1.png` — Пленник гостиницы, 1024 × 1536, разворот влево.
- `public/characters/border-raider-v1.png` — Налётчик у лесного рубежа, 1024 × 1536, разворот влево.
- `public/characters/wounded-marauder-v1.png` — Раненый мародёр, 1024 × 1536, разворот влево.
- `public/characters/reed-crone-v1.png` — Старуха в камышах, 1024 × 1536, разворот влево.
- `public/characters/marsh-prisoner-v1.png` — Пленник болотницы, 1024 × 1536, разворот влево.
- `public/characters/marsh-pursuer-v1.png` — Преследователь на болотах, 1024 × 1536, разворот влево.
- `public/characters/caravan-watch-v1.png` — Дозорный каравана, 1024 × 1536, разворот влево.
- `public/characters/fortress-mercenary-v1.png` — Наёмник крепости, 1024 × 1536, разворот влево.
- `public/characters/order-courier-v1.png` — Связной ордена, 1024 × 1536, разворот влево.
- `public/characters/garrison-soldier-v1.png` — Солдат гарнизона, 1024 × 1536, разворот влево.
- `public/characters/veyr-hunter-v1.png` — Охотник Вейра, 1024 × 1536, разворот влево.
- `public/characters/wounded-soldier-v1.png` — Раненый солдат, 1024 × 1536, разворот влево.
