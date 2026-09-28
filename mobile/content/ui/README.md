# Мобильные текстуры по утверждённому макету

Общая шапка карты, боя, кузницы и результатов: [материалы, деление атласа и запросы генерации](header-design.md).

Созданы встроенным `image_gen` (навык `imagegen`), 27 сентября 2026.
Референс для всех трёх запросов — утверждённый пользователем вертикальный макет боя
с текстом над шкалами и кнопкой «Подтвердить ход». Это отдельные материалы для
нативных компонентов Godot, не растровый экран приложения.

- `button-slate-v1.png` — общая девятисегментная текстура кнопки. Прозрачность сохранена.
- Срезы основной кнопки уменьшены по утверждённому макету.
- `board-tile-v1.png` — общая клетка поля, фигур руки и перетаскиваемой фигуры.
- `guard-v1.png` — прежняя мобильная иллюстрация блока, удалена после перехода на общий арт.
  Актуальная иллюстрация берётся из общего `data/base-figures.json`.

`.png.import` ограничивает доставляемые текстуры 512 px. Исходные PNG не уменьшены.
`gothic_theme.gd` исключает почти прозрачные поля при выборе области кнопки и иконок.
Каноническая иконка осколков синхронизируется из `public/ui/logos-shards-v3.png`.

## Запросы генерации

### Кнопка

Create a production game UI asset, a single empty horizontal button from the bottom of this reference. Dark charcoal slate finely worn stone center, narrow antique bronze double bevel edge, clipped 45 degree corners. Almost rectangular, no protruding ornaments. Orthographic front view, no perspective. No text, no symbols, no scenery. The button fills nearly the whole image with only 2% transparent margin. Wide ratio 5:1. Border thickness ~2% of height; center very quiet and dark for readable ivory text. Reference is style only, output ONLY the empty button.

### Блок

Create a single game inventory icon matching the crossed forearms blocking illustration on the lower left of the board in reference. Two anatomically clear crossed forearms with aged dark steel vambraces and leather wrist wraps, closed hands, forming an X defensive block. Sculptural gothic realism, upper left warm ivory rim light, restrained charcoal and patinated bronze, strong silhouette readable at 40px. Isolated cutout transparent background, centered object occupies 88% of square, no frame, no letters, no extra icons. Reference is style only, output ONLY this defensive block icon.

### Клетка

Create a single square game board tile texture matching the dark empty board cells in reference. Orthographic front face of very dark rough slate, subtle engraved irregular cracks, scant moss only in crevices near edges. Narrow beveled cold steel rim with old bronze highlights, clipped corners. Sparse low contrast details so artwork overlays remain legible. No symbols, no letters, no objects, no scenery, no UI screenshot, no grid. The single square tile fills the entire square image. Reference is style only.

## Уточнение материалов поля, 27 сентября 2026

`board-v2.png` — единое поле 3×3 с различающимися клетками (импорт до 1024 px).
`cell-player-v2.png`, `cell-enemy-v2.png`, `cell-contested-v2.png` — три состояния
занятой клетки (импорт до 512 px). Все четыре изображения созданы `image_gen`
по тому же утверждённому макету, без текста, предметов и счётчиков. Исходные PNG
сохранены без обрезки и ретуши. Иллюстрации фигур накладываются отдельными узлами;
фигуры, экипировка и навыки используют исходную прозрачность общих PNG.
`scripts/sync_content.py` обновляет мобильные копии по общим каталогам и сохраняет
альфа-канал при уменьшении. Локальные подмены иллюстраций и шейдер удаления фона
удалены; пути карт в старых сохранениях разрешаются через актуальный каталог
без изменения колоды и параметров боя.
`board-tile-v1.png` остаётся материалом фигур в руке и перетаскивания.

Границы каменных ячеек `board-v2.png` размечены в `ui/board.gd` в координатах
исходных 1254×1254 пикселей. У нарисованной сетки есть толщина, отступы и небольшое
отклонение от точных третей. Цветные клетки масштабируются внутрь этих границ;
срезы углов оставляют видимыми ромбы на пересечениях. Та же разметка используется
для выбора клетки. При смене этой текстуры разметку необходимо сверить заново.
Предпросмотр допустимого перетаскивания рисуется самим полем, без второй,
свободно движущейся текстуры поверх его рамок. Общие изображения не редактируются.

### Целое поле — `board-v2.png`

Use case: stylized-concept. Production native game UI texture for Heroes of Orvesk. Match the attached approved battle mockup's BOARD materials closely: charcoal cracked slate, small chips, faint moss, worn sculptural metal under upper-left ivory light. Straight-on orthographic, square canvas. No characters, hands, creatures, icons, words, numbers, symbols or scenery. Keep the dark textured interior suitable for overlaying separate item artwork. Generate the ENTIRE empty 3 by 3 board as ONE continuous square asset. Exactly 9 equal square cells, boundaries exactly at 1/3 and 2/3 in both axes. Each cell has different subtle slate cracks and moss, not a repeated identical tile. Connected thin aged steel grid frame and four small outer corner diamond studs, tiny stud at grid junctions. Thin rim about 2% of a cell. Entire board fills the square edge to edge with at most 1% transparent perimeter. Nine unoccupied cells, no green or orange occupant frames. Opaque cell interiors.

### Клетка героя — `cell-player-v2.png`

Use case: stylized-concept. Production native game UI texture for Heroes of Orvesk. Match the attached approved battle mockup's BOARD materials closely: charcoal cracked slate, small chips, faint moss, worn sculptural metal under upper-left ivory light. Straight-on orthographic, square canvas. No characters, hands, creatures, icons, words, numbers, symbols or scenery. Keep the dark textured interior suitable for overlaying separate item artwork. Generate ONE single square occupied-cell background, empty of artwork. Entire tile fills square edge to edge, no surrounding whitespace. Sculpted grey sage-green metal perimeter frame, width about 4% of tile edge, subtle worn bevel, clipped 45 degree corners. Frame clearly grey-green but subdued, not vivid glowing green. Rough charcoal slate interior. Only one frame, no internal divisions.

### Клетка противника — `cell-enemy-v2.png`

Use case: stylized-concept. Production native game UI texture for Heroes of Orvesk. Match the attached approved battle mockup's BOARD materials closely: charcoal cracked slate, small chips, faint moss, worn sculptural metal under upper-left ivory light. Straight-on orthographic, square canvas. No characters, hands, creatures, icons, words, numbers, symbols or scenery. Keep the dark textured interior suitable for overlaying separate item artwork. Generate ONE single square occupied-cell background, empty of artwork. Entire tile fills square edge to edge, no surrounding whitespace. Sculpted aged ochre bronze metal perimeter frame, width about 4% of tile edge, subtle worn bevel, clipped 45 degree corners. Frame clearly ochre, not bright glowing orange. Rough charcoal slate interior. Only one frame, no internal divisions. Match same structural shape as the green frames in reference.

### Две фигуры в клетке — `cell-contested-v2.png`

Use case: stylized-concept. Production native game UI texture for Heroes of Orvesk. Match the attached approved battle mockup's BOARD materials closely: charcoal cracked slate, small chips, faint moss, worn sculptural metal under upper-left ivory light. Straight-on orthographic, square canvas. No characters, hands, creatures, icons, words, numbers, symbols or scenery. Keep the dark textured interior suitable for overlaying separate item artwork. Generate ONE square occupied-cell background divided into exactly TWO equal vertical panels, filling the square edge to edge. Left half has a sculpted grey sage-green metal frame, right half has aged ochre bronze metal frame. Thin central seam. Outer border and central borders have same thickness, about 3% of whole square. Each panel dark rough slate, subtly different grain. Clipped corners, subtle bevel and patina. Empty panels without figure artwork. This is ONE square tile with TWO tall slots, not two squares side by side.

## Окно героя

Квадратные кнопки «+ / −» используют текстуры `button-square-v1.png` и `button-square-pressed-v1.png`; подключение — `mobile/ui/square_button.gd`.
