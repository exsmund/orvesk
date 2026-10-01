extends RefCounted
## Cell profiles remain attached to shape indices while geometry rotates.
const EFFECTS = ["category", "blocks", "evades", "counter", "blockCost", "healthDamage", "staminaDamage", "staminaDamagePerCell"]

static func mixed(card: Dictionary) -> bool:
	return not card.get("cellActions", []).is_empty()

static func action(card: Dictionary, index: int) -> Dictionary:
	if not mixed(card): return card
	var definition: Dictionary = card.cellActions[index]
	var result = card.duplicate()
	result.erase("cellActions")
	result.erase("healing")
	result.erase("healingMaxHealthPercent")
	for key in EFFECTS: result.erase(key)
	# Cell effects are complete profiles. Figure-wide costs and healing stay on the card.
	for key in EFFECTS:
		if definition.has(key): result[key] = definition[key]
	result.shape = [[0,0]]
	result.cellIndex = index
	result.figureName = card.name
	result.name = definition.get("name", card.name)
	result.description = definition.get("description", "")
	result.art = definition.get("art", card.get("art", ""))
	if not result.art.is_empty(): result.cellArt = result.art
	return result

static func components(card: Dictionary) -> Array:
	return card.get("cellComponents", [card]) if not card.is_empty() else []

static func compressed(card: Dictionary) -> Dictionary:
	if not mixed(card): return card
	var parts: Array = []
	for n in card.shape.size(): parts.append(action(card,n))
	var result = parts[0].duplicate()
	result.erase("cellIndex")
	result.name = card.name
	result.description = card.get("description", "")
	result.cellComponents = parts
	result.category = "attack" if parts.any(func(p): return p.get("category", "") == "attack") else "defense"
	result.blocks = parts.any(func(p): return p.get("blocks", false))
	result.evades = parts.any(func(p): return p.get("evades", false))
	result.counter = parts.any(func(p): return p.get("counter", false))
	result.blockCost = 0
	for part in parts: result.blockCost = maxf(result.blockCost, part.get("blockCost",0))
	return result

static func profiles(card: Dictionary) -> Array:
	if not mixed(card): return components(card)
	var result: Array = []
	for n in card.shape.size(): result.append(action(card,n))
	return result

static func stats(card: Dictionary) -> Array:
	var result: Array = []
	for profile in profiles(card):
		for stat in profile.get("healthDamage",{}).get("stats",[]):
			if stat not in result: result.append(stat)
	return result
