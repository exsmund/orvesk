# Актуальные фоны карт

Три фоновых изображения 3000 × 2400, сгенерированные встроенным image_gen. Исходный результат приведён к итоговому размеру через sips.

| Карта | Фон | Промпт |
| --- | --- | --- |
| Лес | [forest-v3.png](../../../public/ui/journey/maps/forest-v3.png) | [forest-terrain-prompt.txt](forest-terrain-prompt.txt) |
| Степь | [steppe-v3.png](../../../public/ui/journey/maps/steppe-v3.png) | [steppe-terrain-prompt.txt](steppe-terrain-prompt.txt) |
| Руины | [ruins-v3.png](../../../public/ui/journey/maps/ruins-v3.png) | [ruins-architecture-prompt.txt](ruins-architecture-prompt.txt) |

Фоны не содержат маршрутов или площадок под значки. Игра рисует значки и прямые пунктирные соединения независимо от изображения. Данные фонов — в [data/journey-maps.json](../../../data/journey-maps.json); координаты и связи создаёт игровой генератор, художественные требования — в [MAP_ART_DIRECTION.md](../../../MAP_ART_DIRECTION.md).

Отдельные `*-battle-v1.png` в public/ui/journey/maps используются на экране боя и не являются версиями карт путешествия.
