# Общая игровая шапка

Утверждённый макет: два варианта общей шапки, карта и бой, с числами ресурсов слева,
прогнозом справа и небольшим номером карты под существующим значком режима.
Реализация — `mobile/ui/game_header.gd`. Шапка используется на карте (в том числе
у костра), в бою, кузнице и на экранах победы, поражения и ничьей. Название карты,
хода или экрана находится внутри рамки, под разделителем. Старый счётчик
«Круг … Противники …» удалён. Окна с вкладками и карточки предметов сохраняют
свои собственные заголовки.

## Материалы

Новые ассеты созданы встроенным `image_gen`, 27 сентября 2026, по утверждённому
макету. Исходный альфа-канал сохранён, автоматического удаления фона нет.

- [header-frame-v1.png](header-frame-v1.png) — тонкая бронзовая рамка с завитками.
  `texture_frame.gd` рисует девять сегментов без центра: углы фиксированы,
  середины сторон растягиваются. Углы увеличены до 34 логических единиц, чтобы
  рамка читалась как в макете. Импорт ограничен 1024 px с mipmaps.
- [header-divider-v1.png](header-divider-v1.png) — металлическая полоса с ромбом.
  `header_divider.gd` использует три области одного атласа: две растягиваемые
  полосы и центральный орнамент высотой 12 логических единиц. Области заданы
  относительно исходных 2164×727; высота и пропорции ромба не зависят от ширины
  экрана. При замене текстуры следует сверить координаты областей.
- `character-slate-v1.png` переиспользуется для тёмного камня. Зерно сохраняет
  масштаб; `header_stone.gdshader` добавляет тень внутрь рамки, отдельный
  `header_shadow.gdshader` — мягкую тень вокруг панели.
- Рамка портрета, обе иконки режима и иконка осколков взяты из синхронизированных
  общих `images/ui/*`. Новые копии этих иконок не создавались.
- [resource-rim-v1.png](resource-rim-v1.png) — бронзовый ободок шкалы с прозрачным
  центром. Шейдер рисует девять сегментов с фиксированной толщиной 2 логических
  единицы; область с учётом прозрачных полей определяется по альфа-каналу.
- [resource-fill-v1.png](resource-fill-v1.png) — серый сатинированный металл для
  заполнения. Шейдер тонирует его цветами ресурсов из общей палитры, сохраняя
  масштаб мелкой горизонтальной фактуры. Постоянной анимации текстур нет.

`resource_bar.gd` имеет режим шапки: без символов и названий ресурсов, значение
слева, прогноз справа, над шкалой. Четыре строки используют единый подогнанный
размер шрифта с базовым размером 14. Круглые портреты имеют равные отступы сверху
и со стороны внешнего края шапки. Окно героя использует прежнюю компоновку того же
ResourceBar и новые материалы. До ответа врага прогноз по открытым клеткам
показывается без знака «≈»; после раскрытия используются точные потери.
`fitted_label.gd` уменьшает длинный заголовок или номер карты до одной строки,
без многоточия; изменение размера окна снова рассчитывает размер шрифта.

Осколки по-прежнему рисует общий `shard_counter.gd`. В шапке включены разделители
тысяч и высота иконки 1.32 от видимых цифр. У остальных вызовов сохраняются их
размеры. Макеты используют 124 580 только как пример: приложение берёт баланс,
номер карты, ресурсы и прогноз из текущей сессии.

## Запрос генерации рамки

Production raster game UI asset, not a mockup. Reference image shows approved
header. Generate ONLY its EMPTY OUTER rectangular FRAME as one square texture,
to be used as a nine-slice scalable border. Actual transparent background and
transparent empty center. Straight-on orthographic, axis aligned. Frame reaches
canvas edges, no padding. Square canvas 1024x1024. Thin double-rail aged bronze
frame with softly weathered metallic ivory highlights, very dark tarnish in
crevices. Precisely match the reference header's delicate restrained ornamental
CURLS at the four corners, not large pointed armor studs or thick stone slab
border. Each corner ornament fits within the outer 12% of the square on both
axes. Straight middle rails fine, about 1% canvas width total, same thickness on
all four edges; corner curl ornament protrudes INWARD only. Quiet metallic
craftsmanship, no bright yellow gold, upper-left soft light, sharp details that
survive scaling. Entire center and outside the fine rails transparent. No stone
filling, no labels, no letters, no portraits, no central diamond, no divider, no
icons, no shadows far beyond frame. ONE empty border texture only.

## Запрос генерации разделителя

Production UI texture for this dark fantasy game, NOT a screenshot.
Extract/recreate the slim horizontal DIVIDER immediately above the map name /
turn title in the approved header. Output exactly ONE isolated horizontal bronze
metallic hairline with a SINGLE small hollow four-point lozenge/diamond at its
exact center. Transparent canvas, landscape 3:1. Horizontal line at exact
vertical center, thin sculpted worn bronze with ivory metallic highlight; line
softly fades to transparent toward far ends. Diamond is a hollow elongated
diamond with subtly concave sides, tiny black/TRANSPARENT opening, width about 4%
of canvas and height about 8% of canvas, similar to reference. Line thickness
about 0.4% of canvas height, much thinner than diamond height. Line stops at
diamond edges, symmetrically extends on both sides. Calm weathered metal texture,
realistic bevel light from upper left, subdued antique bronze not neon or yellow
gold. No border around canvas, no extra ornaments, no words, no background panel,
no other icons, no shadows occupying empty space. Entire unused canvas and the
diamond hole truly alpha transparent. This image will be rendered in three
pieces: left rail, fixed-size central diamond, right rail; keep the diamond
precisely centered.

## Запрос генерации ободка шкалы

Production UI asset for the thin health/stamina bars in this approved gothic
game header. Output ONE empty horizontal rectangular bar FRAME ONLY, landscape
3:1 aspect ratio, actual transparent middle and transparent outside. The entire
frame fills canvas to edges with no padding. Straight-on orthographic, square
right-angle corners, no curls, no diamond, no text, no icons, no numbers.
Delicately weathered bronze and dark iron, narrow double bevel, warm ivory
highlight on upper inner rail, deep charcoal inner edge creating inset depth.
Keep the metal rails about 5% of the canvas HEIGHT thick, absolutely the same
physical thickness on all four sides. Short plain end caps: engineered for
nine-slice stretching, no details far from ends. Retain realistic fine patina,
small scratches and mottled metal, not a flat vector rectangle. Quiet antique
bronze, no vivid orange or bright gold, upper-left light. NOTHING in the center:
alpha transparent, no fill. This will frame a separately drawn red or ochre fill
at about 12px height.

## Запрос генерации заполнения шкалы

Generate a production tileable monochrome texture for the FILL of a very narrow
dark fantasy game's health and stamina resource bar, landscape 3:1 canvas.
Orthographic macro view of aged satin metal with fine horizontal brushing, very
subtle dense stone-like patina and fine small scratches. GREYSCALE only; intended
for red or ochre shader tint. No colored pixels. Medium-dark gray material, quiet
but clearly visible microtexture, no large cracks. Soft restrained bevel
highlight across the top 12% fading to darker gray at the bottom, no white
specular hotspots. Left/right edges seamlessly tile with no endcaps. Texture
fills entire image edge to edge, no transparency, no frame/border, no surrounding
scene, no lettering/numbers/icons, no empty transparent space. This is a material
sample, not a UI screen or a complete bar.
