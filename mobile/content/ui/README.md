# Мобильные текстуры по утверждённому макету

Общая шапка карты, боя, кузницы и результатов: [материалы, деление атласа и запросы генерации](header-design.md).

Текстуры поля созданы встроенным `image_gen` (навык `imagegen`).
Референс для исходных запросов — утверждённый пользователем вертикальный макет боя
с текстом над шкалами и кнопкой «Подтвердить ход». Это отдельные материалы для
нативных компонентов Godot, не растровый экран приложения.

- `button-gold-v1.png` — общая текстура основных кнопок по варианту 02: тёплый тёмный камень, двойная золотая рамка с вогнутыми углами и боковые ромбы. Прозрачность сохранена; импорт до 1024 px с mipmaps.
- `framed_button_style.gd` масштабирует торцы по высоте и повторяет среднюю часть по ширине: ромбы и углы не растягиваются. Под нативной надписью рисуется мягкая тёмная тень со смещением вниз, включая недоступное состояние. Кнопка покупки характеристик с осколками использует такую же тень своего счётчика.
- `board-tile-v1.png` — общая клетка поля, фигур руки и перетаскиваемой фигуры.
- `guard-v1.png` — прежняя мобильная иллюстрация блока, удалена после перехода на общий арт.
  Актуальная иллюстрация берётся из общего `data/base-actions.json`.

`.png.import` ограничивает доставляемые текстуры 512 px. Исходные PNG не уменьшены.
`gothic_theme.gd` исключает почти прозрачные поля при выборе области кнопки и иконок.
Каноническая иконка осколков синхронизируется из `images/ui/logos-shards.png`.

## Рамки интерфейса

- `portrait-frame-round.png` — круглые портреты в шапке игры, списках героев и существ. Большие портреты отображаются без рамки и подложки.
- `gothic-frame.png` — общая рамка окон, кнопок и ячеек; материал разделителей.

Godot загружает эти PNG напрямую из `res://content/ui/`; `sync_content.py` их не копирует.
Исходники сохраняются без изменения; импорт ограничивает текстуры 512 px.
У прямоугольных рамок включены mipmap-уровни для отображения при уменьшении.
Сохранившиеся запросы — [art-prompts/mobile/content/ui](../../../art-prompts/mobile/content/ui).
Общее художественное направление — [ART_DIRECTION.md](../../../docs/ART_DIRECTION.md).

## Запросы генерации

### Кнопка

Актуальный точный запрос и переданный макет: [button-gold-v1.json](../../../art-prompts/mobile/content/ui/button-gold-v1.json). Ассет сгенерирован встроенным `image_gen` без текста; надпись и её тень рисуются в приложении.

### Блок

Create a single game inventory icon matching the crossed forearms blocking illustration on the lower left of the board in reference. Two anatomically clear crossed forearms with aged dark steel vambraces and leather wrist wraps, closed hands, forming an X defensive block. Sculptural gothic realism, upper left warm ivory rim light, restrained charcoal and patinated bronze, strong silhouette readable at 40px. Isolated cutout transparent background, centered object occupies 88% of square, no frame, no letters, no extra icons. Reference is style only, output ONLY this defensive block icon.

### Клетка

Create a single square game board tile texture matching the dark empty board cells in reference. Orthographic front face of very dark rough slate, subtle engraved irregular cracks, scant moss only in crevices near edges. Narrow beveled cold steel rim with old bronze highlights, clipped corners. Sparse low contrast details so artwork overlays remain legible. No symbols, no letters, no objects, no scenery, no UI screenshot, no grid. The single square tile fills the entire square image. Reference is style only.

## Материалы поля

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

В `ui/board.gd` центры нарисованных перекладин размечены в координатах исходного PNG 1254×1254 (`SOURCE_X`, `SOURCE_Y`). При отрисовке они отображаются на равномерную сетку `GRID_AXES`; `CELL_X` и `CELL_Y` задают одинаковые квадратные области внутри перекладин. Эта же геометрия используется для касаний. Срезы углов оставляют видимыми ромбы на всех пересечениях. За внешним контуром поля — настоящий альфа-канал, без чёрных полос. При замене ассета нужно сверить разметку.

Для каждой занятой клетки выбирается одна текстура: серо-зелёная героя, багряная противника, двойная серо-зелёная/багряная либо один из вариантов комбинации из `data/combos.json.art`. `contested` — отдельный квадратный ассет с золотой левой и багряной правой половинами. Он не накладывается поверх зелёной рамки; камень не сжимается из квадратной текстуры. Свечение рисуется только под действием героя. У чисел урона предусмотрен отступ от нижнего обода.

Предпросмотр допустимого перетаскивания рисуется самим полем, без второй свободно движущейся текстуры поверх рамок. Иллюстрации действий сохраняют пропорции.

Актуальные точные запросы и референсы:
- [поле](../../../art-prompts/mobile/content/ui/board-v2.json);
- [клетка героя](../../../art-prompts/mobile/content/ui/cell-player-v2.json);
- [клетка противника](../../../art-prompts/mobile/content/ui/cell-enemy-v2.json);
- [две фигуры](../../../art-prompts/mobile/content/ui/cell-contested-v2.json);
- [две фигуры с комбинацией героя](../../../art-prompts/ui/combos/contested.json).

## Окно героя

Квадратные кнопки «+ / −» используют текстуры `button-square-v1.png` и `button-square-pressed-v1.png`; подключение — `mobile/ui/square_button.gd`.

### Рамки фигур

`figure-player-frame.png` и `figure-enemy-frame.png` — цельные текстуры с тёмным каменным фоном для общего компонента фигур: светлый серо-зелёный металл игрока и багряный металл противника. Геометрия повторяет рамки клеток поля, обод толще для читаемости небольших фигур. Цветные контурные линии не используются. PNG RGBA; исходники и запросы — `art-prompts/mobile/content/ui`.

Фон фигур встроен в текстуру и не рисуется отдельным квадратом. Внешние скошенные углы прозрачны, внутренняя каменная область непрозрачна. У спорной клетки только две цветные рамки (светлая серо-зелёная и багряная), без внешнего металлического обода; толщина цветных полос соответствует `cell-enemy-v2.png`.

Цветовые варианты общей кнопки: `button-secondary-v1.png` (серый камень) и `button-danger-v1.png` (красный камень), с золотой рамкой. Тема предоставляет `SecondaryButton` и `DangerButton`; состояния и тень текста общие. Рецепты находятся в `art-prompts/mobile/content/ui/`.
