extends RefCounted
## Mobile reward selection. Item definitions and level variation remain in the shared catalog.
var data

func _init(catalog):
	data = catalog

func shards(player: Dictionary, is_boss: bool) -> int:
	var next_upgrade_cost = data.level(player) + 2
	if is_boss: return ceili(next_upgrade_cost * 1.5)
	# Two successive upgrades cost C + (C + 1); three ordinary wins fund both.
	return ceili((2 * next_upgrade_cost + 1) / 3.0)

func count(player: Dictionary, enemy: Dictionary) -> int:
	return 1 if data.level(enemy) < data.level(player) else 2

func roll_item(template: Dictionary, enemy: Dictionary, rng: RandomNumberGenerator) -> Dictionary:
	var budget = floori(maxi(0, data.stat_total(enemy) - 4) / 2.0)
	var variations = data.balance.loot.variation
	var variation = variations[rng.randi_range(0, variations.size() - 1)]
	return data.item("%s@%d" % [template.id, 1 + floori(maxi(0, budget + variation) / float(maxi(1, template.requirements.size())))])

func valid(option: Dictionary, player: Dictionary) -> bool:
	match option.get("kind", ""):
		"skill": return not data.lookup(data.skills, option.get("skillId", "")).is_empty() and option.skillId not in player.skills
		"item":
			if data.lookup(data.items, str(option.get("itemId", "")).split("@")[0]).is_empty(): return false
			var equipment = data.item(option.itemId)
			return not equipment.get("unarmed", false) and data.permits(player, equipment) and equipment.id not in player.gear.values()
	return false

func usable(option: Dictionary, player: Dictionary) -> bool:
	return valid(option, player) and (option.kind == "skill" or data.can_use(player, data.item(option.itemId)))

func compatible(option: Dictionary, chosen: Array) -> bool:
	for previous in chosen:
		if option.kind == "skill" and previous.kind == "skill": return false
		if option.kind == "item" and previous.kind == "item" and data.item(option.itemId).templateId == data.item(previous.itemId).templateId: return false
	return true

func pick(pool: Array, rng: RandomNumberGenerator) -> Dictionary:
	if pool.is_empty(): return {}
	# Equal chance between available kinds, then between entries of that kind.
	var kinds: Array = []
	for kind in ["item", "skill"]:
		if pool.any(func(option): return option.kind == kind): kinds.append(kind)
	var kind = kinds[rng.randi_range(0, kinds.size() - 1)]
	var candidates = pool.filter(func(option): return option.kind == kind)
	return candidates[rng.randi_range(0, candidates.size() - 1)]

func roll(player: Dictionary, enemy: Dictionary, rng: RandomNumberGenerator) -> Array:
	var available: Array = []
	var all: Array = []
	for skill in data.skills:
		var option = {"kind": "skill", "skillId": skill.id}
		if valid(option, player):
			available.append(option)
			all.append(option)
	for template in data.items:
		if template.get("unarmed", false) or template.tier > data.stat_total(enemy) - 3: continue
		var equipment = roll_item(template, enemy, rng)
		var option = {"kind": "item", "itemId": equipment.id}
		if valid(option, player): all.append(option)
		# The guaranteed usable offer may be a lower level of the rolled template.
		var rank = int(equipment.level)
		for stat in equipment.requirements: rank = mini(rank, int(player.stats[stat]))
		var usable_item = data.item("%s@%d" % [template.id, rank])
		var ready = {"kind": "item", "itemId": usable_item.id}
		if usable(ready, player):
			available.append(ready)
			if ready not in all: all.append(ready)
	var first = pick(available, rng)
	if first.is_empty(): return []
	var result: Array = [first]
	if count(player, enemy) == 2:
		var second = pick(all.filter(func(option): return compatible(option, result)), rng)
		if not second.is_empty(): result.append(second)
	return result
