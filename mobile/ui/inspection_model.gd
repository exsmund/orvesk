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
	preview.gear[equipment.slot] = null if equipment.get("unarmed", false) else equipment.id
	if equipment.get("hands", 1) == 2: preview.gear.shield = null
	elif equipment.slot == "shield" and data.item(preview.gear.weapon).get("hands", 1) == 2: preview.gear.weapon = null
	var figures = combat.figures(preview).filter(func(card):
		return card.get("availability", "") == "emptyWeapon" if equipment.get("unarmed", false) else card.id.begins_with(equipment.id + ":"))
	var category = SLOT_NAMES[equipment.slot]
	if equipment.kind == "weapon":
		category = "Двуручное" if equipment.get("hands",1) == 2 else "Одноручное"
		if equipment.get("unarmed",false): category = "Без оружия"
	var metadata = "Уровень %d · %s" % [equipment.level, category]
	return {"kind":"item", "reference":equipment.id, "title":equipment.name, "status":status,
		"texture":data.image(data.art.get(equipment.templateId, "")), "metadata":metadata,
		"requirements":equipment.requirements, "defense":equipment.get("defense", {}),
		"description":equipment.description, "figures":figures, "fighter":preview,
		"copies":copy_counts(preview), "eligible":data.can_use(player, equipment)}

func skill(id: String, player: Dictionary, status: String = "", replacement_slot: int = -1) -> Dictionary:
	var definition = data.lookup(data.skills, id)
	var preview = player.duplicate(true)
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

func item_comparison(reference: String, player: Dictionary, offered: bool) -> Array:
	if not offered: return [[item(reference, player, "Надето")]]
	var worn = replaced_items(reference, player)
	var candidate = item(reference, player, "Предлагается")
	if worn.is_empty(): return [[candidate]]
	return [[candidate], worn.map(func(id): return item(id, player, "Надето"))]

func damage_label(type: String) -> String:
	var name: String = damage_types.get(type, {}).get("name", type)
	return name + " урон" if name.ends_with("ий") else "Урон (%s)" % name

func formula_lines(fighter: Dictionary, card: Dictionary) -> Array:
	var lines: Array = []
	var profile = card.get("healthDamage", {})
	var parts = combat.parts(fighter, card)
	if not profile.is_empty() and not parts.is_empty():
		var level_bonus = profile.stats.size() * maxi(0, int(card.get("sourceLevel", 1)) - 1) * data.balance.damage.levelPerRequiredStat
		var budget = number(profile.base + level_bonus)
		for stat in profile.stats:
			var term = "(%s %s − 1)" % [data.STAT_NAMES[stat], number(fighter.stats[stat])]
			if data.balance.damage.perStatPoint != 1: term = number(data.balance.damage.perStatPoint) + " × " + term
			budget += " + " + term
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
			lines.append("%s: %s = %s × %d" % [damage_label(part.type), expression, number(part.value), card.shape.size()])
	if card.get("staminaDamagePerCell", 0) > 0:
		lines.append("Урон выносливости: %s × %d" % [number(card.staminaDamagePerCell), card.shape.size()])
	if card.get("blocks", false): lines.append("Блокирует урон в занятых клетках.")
	if card.get("evades", false): lines.append("Уклонение от урона в занятых клетках.")
	if card.get("counter", false): lines.append("Контратака — только против атаки.")
	if card.get("healing", 0) > 0: lines.append("Лечение: %s за всю фигуру после урона." % number(card.healing))
	return lines
