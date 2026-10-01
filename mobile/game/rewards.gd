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

func item_weight(option: Dictionary, player: Dictionary) -> float:
	if option.kind != "item" or player.is_empty(): return 1.0
	var equipment = data.item(option.itemId)
	if data.has_equipment(player, equipment.slot): return 1.0
	if equipment.slot == "shield" and data.item(player.gear.get("weapon")).get("hands", 1) == 2: return 1.0
	return float(data.balance.loot.emptySlotWeight)

func pick(pool: Array, rng: RandomNumberGenerator, player: Dictionary = {}) -> Dictionary:
	if pool.is_empty(): return {}
	# Configured weights apply to available kinds, not individual catalog entries.
	var weights: Dictionary = data.balance.loot.rewardKindWeights
	var kinds: Array = []
	var total = 0
	for kind in weights:
		if int(weights[kind]) > 0 and pool.any(func(option): return option.kind == kind):
			kinds.append(kind)
			total += int(weights[kind])
	if kinds.is_empty(): return {}
	var roll = rng.randi_range(1, total)
	for kind in kinds:
		roll -= int(weights[kind])
		if roll <= 0:
			var candidates = pool.filter(func(option): return option.kind == kind)
			var weights_by_item: Array = candidates.map(func(option): return item_weight(option, player))
			var item_total = 0.0
			for weight in weights_by_item: item_total += weight
			var cursor = rng.randf() * item_total
			for i in candidates.size():
				cursor -= weights_by_item[i]
				if cursor < 0: return candidates[i]
			return candidates.back()
	return {}

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
		for stat in equipment.requirements: rank = mini(rank, data.effective_stat(player, stat))
		var usable_item = data.item("%s@%d" % [template.id, rank])
		var ready = {"kind": "item", "itemId": usable_item.id}
		if usable(ready, player):
			available.append(ready)
			if ready not in all: all.append(ready)
	var first = pick(available, rng, player)
	if first.is_empty(): return []
	var result: Array = [first]
	if count(player, enemy) == 2:
		var second = pick(all.filter(func(option): return compatible(option, result)), rng, player)
		if not second.is_empty(): result.append(second)
	return result
