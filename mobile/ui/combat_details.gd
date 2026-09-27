extends RefCounted
## Text is built from the same calculation snapshot as the bars and board.
var damage_types: Dictionary

func _init(data):
	damage_types = data.read_json("damage-types")

func number(value: float) -> String:
	return str(snappedf(value, 0.1)).trim_suffix(".0")

func cell_title(cell: Dictionary) -> String:
	return "Клетка %d · ряд %d, столбец %d" % [cell.index + 1, int(cell.index / 3) + 1, int(cell.index) % 3 + 1]

func contact_text(card: Dictionary, opposing: Dictionary) -> String:
	if card.get("counter", false):
		return "Контратака срабатывает против атаки." if opposing.get("category", "") == "attack" else "Нет встречной атаки — контратака не наносит урон."
	if opposing.get("evades", false): return "Противник уклоняется: урон здоровью и выносливости отменён."
	if opposing.get("blocks", false): return "Противник блокирует: урон здоровью и выносливости отменён."
	if opposing.get("category", "") == "attack": return "Обмен ударами: проходит половина урона здоровью и выносливости."
	return "Атака в открытое место: урон проходит полностью, с учётом брони."

func cell_text(cell: Dictionary) -> String:
	var lines: Array = []
	if not cell.known:
		var card = cell.player
		lines.append("Расстановка противника скрыта. Точный прогноз появится после раскрытия.")
		if not card.is_empty():
			lines.append("Ваша фигура: " + card.name + "\n" + card.get("description", ""))
			lines.append("Потенциал этой клетки: %s здоровья, %s выносливости. Без учёта брони и ответа противника." % [number(cell.potential), number(cell.potentialStamina)])
			if card.get("counter", false): lines.append("Контратака нанесёт урон только при встречной атаке.")
			lines.append("Цена фигуры: %s; резерв блока за клетку: %s выносливости." % [number(card.get("staminaCost", 0)), number(card.get("blockCost", 0))])
		return "\n\n".join(lines)
	lines.append("Потери в этой клетке:\nВы: −%s здоровья, −%s выносливости.\nПротивник: −%s здоровья, −%s выносливости." % [number(cell.playerDamage), number(cell.playerStaminaDamage), number(cell.enemyDamage), number(cell.enemyStaminaDamage)])
	for side in ["player", "enemy"]:
		var card = cell[side]
		var other = cell.enemy if side == "player" else cell.player
		var who = "Вы" if side == "player" else "Противник"
		lines.append(who + ": " + card.get("name", "пустая клетка"))
		if card.is_empty(): continue
		if not card.get("description", "").is_empty(): lines.append(card.description)
		var attack = cell.get(side + "Attack", {})
		if not attack.is_empty():
			lines.append(contact_text(card, other))
			var parts: Array = []
			for part in attack.parts:
				parts.append("%s: %s → %s после брони %s" % [damage_types.get(part.type, {}).get("name", part.type), number(part.raw), str(snappedf(part.afterArmor, 0.001)), number(part.armor)])
			if not parts.is_empty(): lines.append("\n".join(parts))
			if attack.concentration != 1: lines.append("Сжатие: урон клетки ×%s." % number(attack.concentration))
			lines.append("После взаимодействия, до ограничения ресурсами: %s здоровья, %s выносливости." % [str(snappedf(attack.health, 0.001)), str(snappedf(attack.stamina, 0.001))])
		if card.get("blocks", false): lines.append("Затраты блока в этой клетке: %s выносливости." % number(cell.get(side + "BlockCost", 0)))
		if card.get("healing", 0) > 0: lines.append("Лечение %s за всю фигуру, после урона и только при выживании." % number(card.healing))
		if card.get("staminaCost", 0) > 0: lines.append("Цена всей фигуры: %s выносливости (оплачивается один раз)." % number(card.staminaCost))
	lines.append("Потери ограничены оставшимися ресурсами и распределены по клеткам с округлением до 0,1. Цена фигур учитывается отдельно от входящего урона.")
	return "\n\n".join(lines)

func result_text(record: Dictionary) -> String:
	var lines: Array = []
	for side in ["player", "enemy"]:
		var summary = record.summary[side]
		lines.append(("Вы" if side == "player" else "Противник") + ": −%s здоровья, −%s выносливости; цена фигур %s." % [number(summary.damage), number(summary.staminaLoss), number(summary.cost)])
		lines.append("После столкновения: %s здоровья, %s выносливости. Лечение: +%s; отдых: +%s выносливости." % [number(summary.hpAfter), number(summary.staminaAfter), number(summary.get("healed", 0)), number(summary.get("staminaRecovered", 0))])
	lines.append("Обычное восстановление выносливости в начале следующего хода здесь не учитывается.")
	if not record.summary.has("cells"):
		lines.append("Этот ход сохранён старой версией без подробностей по клеткам. Разбор появится после следующего хода.")
	else:
		for cell in record.summary.cells:
			lines.append(cell_title(cell) + "\n" + cell_text(cell))
	return "\n\n".join(lines)
