extends RefCounted
## Read-only presentation of equipment/skills using the same figures and damage as combat.
var data
var combat
var damage_types: Dictionary
const SLOT_NAMES = {"weapon":"Правая рука", "shield":"Левая рука", "body":"Тело", "feet":"Ноги", "ring":"Кольцо", "amulet":"Амулет"}

func _init(catalog, rules):
	data = catalog
	combat = rules
	damage_types = data.read_json("damage-types")

func number(value: float) -> String:
	return str(snappedf(value, 0.001)).trim_suffix(".0")

func item(reference, player: Dictionary, status: String = "") -> Dictionary:
	var equipment = data.item(reference)
	var preview = player.duplicate(true)
	preview.gear[equipment.slot] = equipment.id
	if equipment.get("hands", 1) == 2: preview.gear.shield = null
	elif equipment.slot == "shield" and data.item(preview.gear.weapon).get("hands", 1) == 2: preview.gear.weapon = null
	var figures = combat.figures(preview).filter(func(card):
		return card.get("availability", "") == equipment.baseFigureAvailability if equipment.get("unarmed", false) else card.id.begins_with(equipment.id + ":"))
	var category = SLOT_NAMES[equipment.slot]
	if equipment.kind == "weapon":
		category = "Двуручное" if equipment.get("hands",1) == 2 else "Одноручное"
		if equipment.get("unarmed",false): category = "Без оружия"
	var metadata = "Уровень %d · %s" % [equipment.level, category]
	var tier = data.weapon_tier(int(equipment.tier)) if equipment.kind == "weapon" else {}
	if not tier.is_empty(): metadata = tier.name + " · " + metadata
	return {"titleColor":tier.get("color", "text-home"), "kind":"item", "reference":equipment.id, "title":equipment.name, "status":status,
		"texture":data.image(data.art.get(equipment.templateId, "")), "metadata":metadata,
		"requirements":equipment.requirements, "defense":equipment.get("defense", {}),
		"description":equipment.description, "figures":figures, "fighter":preview,
		"copies":copy_counts(preview), "eligible":data.can_use(player, equipment)}

func skill(id: String, player: Dictionary, status: String = "", replacement_slot: int = -1) -> Dictionary:
	var definition = data.lookup(data.skills, id)
	var preview = player.duplicate(true)
	var conflict = data.conflicting_skill_slot(preview, id)
	if conflict >= 0: replacement_slot = conflict
	if replacement_slot >= 0: preview.skills[replacement_slot] = id
	elif id not in preview.skills: preview.skills.append(id)
	return {"kind":"skill", "reference":id, "title":definition.name, "status":status,
		"texture":data.image(definition.get("art", "")),
		"metadata":"Навык" if definition.has("figure") else "Пассивный навык",
		"requirements":{}, "defense":{}, "description":definition.description,
		"figures":combat.figures(preview).filter(func(card): return card.get("skillId", "") == id),
		"fighter":preview, "copies":copy_counts(preview), "eligible":true}

func copy_counts(fighter: Dictionary) -> Dictionary:
	var result: Dictionary = {}
	for card in combat.build_deck(fighter): result[card.templateId] = result.get(card.templateId, 0) + 1
	return result

func creature(id: String, fighter: Dictionary) -> Dictionary:
	var definition = data.lookup(data.creatures, id)
	var preview = fighter.duplicate(true)
	preview.creatureId = id
	preview.name = definition.name
	var metadata = "Встречается с карты %d" % definition.encounter.minExpedition if definition.encounter.combat else "Не участвует в боях"
	return {"kind":"creature", "reference":id, "title":definition.name, "status":"",
		"texture":data.portrait(preview), "metadata":metadata,
		"requirements":{}, "defense":{}, "description":definition.description,
		"stats":preview.stats, "figures":combat.figures(preview), "fighter":preview,
		"copies":copy_counts(preview), "eligible":true}

func replaced_items(reference: String, player: Dictionary) -> Array:
	var equipment = data.item(reference)
	var slots = [equipment.slot]
	if equipment.get("hands", 1) == 2: slots.append("shield")
	elif equipment.slot == "shield" and data.item(player.gear.weapon).get("hands", 1) == 2: slots.append("weapon")
	var result: Array = []
	for slot in slots:
		var worn = player.gear.get(slot)
		if worn and worn not in result: result.append(worn)
	return result

func lost_items(reference: String, player: Dictionary) -> Array:
	# Bare-body equipment returns to empty slots; it is never permanently lost.
	return replaced_items(reference, player).filter(func(id): return not data.item(id).get("unarmed", false))

func item_comparison(reference: String, player: Dictionary, offered: bool) -> Array:
	if not offered: return [[item(reference, player, "У вас")]]
	var worn = replaced_items(reference, player)
	var candidate = item(reference, player, "Новое")
	var previous_defense: Dictionary = {}
	for id in worn:
		for type in data.item(id).get("defense", {}):
			previous_defense[type] = previous_defense.get(type, 0) + data.item(id).defense[type]
	candidate.defense = candidate.defense.duplicate(true)
	candidate.defenseDelta = {}
	for type in previous_defense:
		if not candidate.defense.has(type): candidate.defense[type] = 0
	for type in candidate.defense:
		candidate.defenseDelta[type] = candidate.defense[type] - previous_defense.get(type, 0)
	if worn.is_empty(): return [[candidate]]
	return [[candidate], worn.map(func(id): return item(id, player, "У вас"))]

func damage_label(type: String) -> String:
	var name: String = damage_types.get(type, {}).get("name", type)
	return name + " урон" if name.ends_with("ий") else "Урон (%s)" % name

func formula_lines(fighter: Dictionary, card: Dictionary) -> Array:
	return formula_runs(fighter, card).map(func(line): return line.prefix + line.result + line.suffix)

func figure_runs(fighter: Dictionary, card: Dictionary, detailed: bool = false) -> Array:
	var runs = formula_runs(fighter, card)
	if detailed: return runs
	for line in runs:
		if not line.result.is_empty() and "×" in line.result:
			line.prefix = line.prefix.get_slice(":", 0) + " = "
	return runs

func formula_runs(fighter: Dictionary, card: Dictionary) -> Array:
	var lines: Array = []
	if combat.Actions.mixed(card):
		var groups = {}
		for i in card.shape.size():
			var key = str(card.cellActions[i])
			if not groups.has(key): groups[key] = {"action":combat.Actions.action(card,i),"count":0}
			groups[key].count += 1
		lines.append({"prefix":"Смешанная фигура. " + card.get("description", ""),"result":"","suffix":""})
		for group in groups.values():
			lines.append({"prefix":"%s · клеток: %d" % [group.action.name,group.count],"result":"","suffix":""})
			var profile = group.action.duplicate(true)
			profile.shape.resize(group.count)
			lines.append_array(formula_runs(fighter,profile))
		var healing = data.figure_healing(fighter,card)
		if healing > 0: lines.append({"prefix":"Лечение за всю фигуру: ","result":number(healing),"suffix":" после урона, только при выживании."})
		return lines
	var profile = card.get("healthDamage", {})
	var parts = combat.parts(fighter, card)
	if not profile.is_empty() and not parts.is_empty():
		var budget = number(profile.base)
		for stat in profile.stats:
			var term = "(%s %s − 1)" % [data.stat_abbreviation(stat), number(data.effective_stat(fighter, stat))]
			if data.balance.damage.perStatPoint != 1: term = number(data.balance.damage.perStatPoint) + " × " + term
			budget += " + " + term
		var level = int(card.get("sourceLevel", 1))
		var level_factor = combat.level_damage_factor(card)
		if level > 1 and level_factor > 0:
			budget += " + (%d − 1)" % level
			if not is_equal_approx(level_factor, 1.0): budget += " × " + number(level_factor)
		var raw = combat.unrounded_damage(fighter, card)
		if not is_equal_approx(raw, roundf(raw)): budget = "окр(%s)" % budget
		var weight = 0.0
		var total = 0.0
		for value in profile.types.values(): weight += value
		for part in parts: total += part.value
		for part in parts:
			if part.value <= 0: continue
			var expression = budget
			var share: float = profile.types[part.type]
			if not is_equal_approx(share, weight):
				expression = "(%s) × %s/%s" % [budget, number(share), number(weight)]
				var exact = total * share / weight
				if not is_equal_approx(exact, roundf(exact)):
					expression = "⌈%s⌉" % expression if part.value > exact else "⌊%s⌋" % expression
			lines.append({"prefix":"%s: %s = " % [damage_label(part.type), expression], "result":"%s × %d" % [number(part.value), card.shape.size()], "suffix":""})
	var stamina_damage = combat.stamina_damage_per_cell(fighter, card)
	if stamina_damage > 0:
		var expression = ""
		var stamina_profile = card.get("staminaDamage", {})
		if not stamina_profile.is_empty():
			expression = number(stamina_profile.base)
			for stat in stamina_profile.stats:
				expression += " + %s × (%s %s − 1)" % [number(stamina_profile.perStatPoint), data.stat_abbreviation(stat), number(data.effective_stat(fighter, stat))]
			expression += " = "
		lines.append({"prefix":"Урон выносливости: " + expression, "result":"%s × %d" % [number(stamina_damage), card.shape.size()], "suffix":""})
	if card.get("blocks", false): lines.append({"prefix":"Блокирует урон в занятых клетках.", "result":"", "suffix":""})
	if card.get("evades", false): lines.append({"prefix":"Уклонение от урона в занятых клетках.", "result":"", "suffix":""})
	if card.get("counter", false): lines.append({"prefix":"Контратака — только против атаки.", "result":"", "suffix":""})
	var healing = data.figure_healing(fighter, card)
	if healing > 0:
		var percentage = " (%s%% максимального здоровья)" % number(card.healingMaxHealthPercent) if card.get("healingMaxHealthPercent", 0) > 0 else ""
		lines.append({"prefix":"Лечение: ", "result":number(healing), "suffix":percentage + " за всю фигуру после урона."})
	return lines
