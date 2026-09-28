# Портреты героя: серия heroes-v2

В [data/portraits.json](../data/portraits.json) оставлены только 25 портретов этой серии. Прежние 35 записей удалены из каталога; исходные изображения остаются в `public/portraits/` как архив и больше не предлагаются для выбора. Старый ID при отображении получает первый портрет нового каталога. Новые PNG находятся в `public/portraits/heroes-v2/`; размер каждого — 1024×1536, формат 2:3, тёмный непрозрачный фон.

Серия создана по [ART_DIRECTION.md](ART_DIRECTION.md): андрогинные взрослые лица, различный возраст и этническая внешность, поворот и взгляд вправо, свет сверху спереди-слева, матовая живописная фактура. Между портретами меняются лицо, причёска, крой и складки простой одежды. Возраст в таблице — художественный ориентир запроса, а не игровая характеристика или установленный возраст героя.

Портреты выбираются через общий каталог: создание героя, карточка персонажа и шапка боя браузерной версии; создание героя, шапка и окно персонажа мобильной версии; выбор героя в story-preview. Существующий выбор человеческих противников также использует этот каталог. Мобильные копии создаются штатным `mobile/scripts/sync_content.py` в `mobile/content/generated/art/portraits/heroes-v2/`.

[Просмотр всей серии в прямоугольнике и круге](../art-prompts/characters/heroes-v2/preview.html). Круг использует документированное `object-fit: cover; object-position: 50% 25%`; предпросмотр не меняет изображения и клиентские стили.

| Превью | ID | Метка в каталоге | Возраст в запросе |
|---|---|---|---:|
| <img src="../public/portraits/heroes-v2/character-36-alder.png" alt="Ольховый" width="96"> | `character-36-alder` | Ольховый | 22 |
| <img src="../public/portraits/heroes-v2/character-37-jasper.png" alt="Яшмовый" width="96"> | `character-37-jasper` | Яшмовый | 28 |
| <img src="../public/portraits/heroes-v2/character-38-rime.png" alt="Изморозь" width="96"> | `character-38-rime` | Изморозь | 72 |
| <img src="../public/portraits/heroes-v2/character-39-sandal.png" alt="Сандаловый" width="96"> | `character-39-sandal` | Сандаловый | 55 |
| <img src="../public/portraits/heroes-v2/character-40-granite.png" alt="Гранитный" width="96"> | `character-40-granite` | Гранитный | 39 |
| <img src="../public/portraits/heroes-v2/character-41-sedge.png" alt="Осоковый" width="96"> | `character-41-sedge` | Осоковый | 66 |
| <img src="../public/portraits/heroes-v2/character-42-tamarind.png" alt="Тамариндовый" width="96"> | `character-42-tamarind` | Тамариндовый | 31 |
| <img src="../public/portraits/heroes-v2/character-43-agate.png" alt="Агатовый" width="96"> | `character-43-agate` | Агатовый | 46 |
| <img src="../public/portraits/heroes-v2/character-44-cedar.png" alt="Кедровый" width="96"> | `character-44-cedar` | Кедровый | 60 |
| <img src="../public/portraits/heroes-v2/character-45-coral.png" alt="Коралловый" width="96"> | `character-45-coral` | Коралловый | 24 |
| <img src="../public/portraits/heroes-v2/character-46-pearl.png" alt="Жемчужный" width="96"> | `character-46-pearl` | Жемчужный | 68 |
| <img src="../public/portraits/heroes-v2/character-47-ebony.png" alt="Эбеновый" width="96"> | `character-47-ebony` | Эбеновый | 74 |
| <img src="../public/portraits/heroes-v2/character-48-rowan.png" alt="Рябиновый" width="96"> | `character-48-rowan` | Рябиновый | 36 |
| <img src="../public/portraits/heroes-v2/character-49-cumin.png" alt="Тминный" width="96"> | `character-49-cumin` | Тминный | 23 |
| <img src="../public/portraits/heroes-v2/character-50-onyx.png" alt="Ониксовый" width="96"> | `character-50-onyx` | Ониксовый | 57 |
| <img src="../public/portraits/heroes-v2/character-51-dune.png" alt="Дюнный" width="96"> | `character-51-dune` | Дюнный | 33 |
| <img src="../public/portraits/heroes-v2/character-52-teak.png" alt="Тиковый" width="96"> | `character-52-teak` | Тиковый | 75 |
| <img src="../public/portraits/heroes-v2/character-53-salt.png" alt="Солевой" width="96"> | `character-53-salt` | Солевой | 25 |
| <img src="../public/portraits/heroes-v2/character-54-fern.png" alt="Папоротниковый" width="96"> | `character-54-fern` | Папоротниковый | 42 |
| <img src="../public/portraits/heroes-v2/character-55-ocean.png" alt="Океанический" width="96"> | `character-55-ocean` | Океанический | 63 |

| <img src="../public/portraits/heroes-v2/character-56-alabaster.png" alt="Алебастровый" width="96"> | `character-56-alabaster` | Алебастровый | 30 |

| <img src="../public/portraits/heroes-v2/character-57-iron.png" alt="Железный" width="96"> | `character-57-iron` | Железный | 32 |
| <img src="../public/portraits/heroes-v2/character-58-mahogany.png" alt="Махагоновый" width="96"> | `character-58-mahogany` | Махагоновый | 47 |
| <img src="../public/portraits/heroes-v2/character-59-juniper.png" alt="Можжевеловый" width="96"> | `character-59-juniper` | Можжевеловый | 55 |
| <img src="../public/portraits/heroes-v2/character-60-dolomite.png" alt="Доломитовый" width="96"> | `character-60-dolomite` | Доломитовый | 68 |

## Происхождение

Первые 20 портретов: встроенный `image_gen`, 2026-09-27. Каждый сгенерирован отдельно с нуля по текстовому описанию. Существующие игровые портреты в этой партии не передавались генератору как изображения-референсы. Запросы и индивидуальные описания — [plan.json](../art-prompts/characters/heroes-v2/plan.json); исходные результаты генератора и проектные пути — [results.json](../art-prompts/characters/heroes-v2/results.json).

Дополнение 2026-09-28 — **Алебастровый**: новый портрет со сходством с `public/portraits/character-03-ivory.png` по прямому запросу пользователя. Светлые волосы, серые глаза и общий характер лица сохранены; одежда и композиция переработаны по текущим требованиям. Исходный портрет остаётся на месте и не становится общим эталоном стиля. Генерация и две правки кадрирования выполнены встроенным `image_gen`; точные запросы, фактически переданные изображения и выбранный результат — [character-56-alabaster.json](../art-prompts/characters/heroes-v2/character-56-alabaster.json).

Дополнение 2026-09-28 — **Железный, Махагоновый, Можжевеловый, Доломитовый**: четыре самостоятельных портрета с немного более выраженными мужскими чертами по запросу пользователя. Более чёткие челюсть, брови и скулы сочетаются с мягкими деталями; без бороды, щетины, макияжа и гипертрофии. Сохранены разные возрастные ориентиры, внешность, одежда, взгляд вправо и свет сверху спереди-слева. Созданы с нуля встроенным `image_gen`, без прикреплённых игровых портретов. Это направление конкретной партии, а не изменение общих требований. [Запросы и исходные результаты](../art-prompts/characters/heroes-v2/masculine-lean-v1.json).
