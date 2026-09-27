extends RefCounted
const Combat = preload("res://game/combat.gd")
const Rewards = preload("res://game/rewards.gd")
var data
var combat
var rewards
var game: Dictionary = {}

func _init(catalog):
	data = catalog
	combat = Combat.new(data)
	rewards = Rewards.new(data)

func restore(payload: Dictionary) -> String:
	var restored: Dictionary = payload.game.duplicate(true)
	# Reject unknown saved profiles explicitly, without changing the current session.
	for f in [restored.player, restored.enemy] + restored.journey.get("enemies", {}).values():
		var error = data.creature_variant_error(f)
		if error: return error
	update_journey_profiles(restored)
	if restored.phase == "victory" and not restored.has("victoryReward"):
		var amount = data.level(restored.enemy) + 1
		for option in restored.get("rewardOptions", []):
			if option.get("kind", "") == "souls": amount = int(option.amount); break
		restored.souls += amount
		restored.victoryReward = {"shards": amount, "recoveredShards": 0}
		restored.rewardOptions = rewards.migrate(restored.get("rewardOptions", []), restored.player, restored.enemy, int(payload.rngState))
	game = restored
	combat.rng.state = int(payload.rngState)
	return ""

func update_journey_profiles(target: Dictionary):
	var j: Dictionary = target.get("journey", {})
	if j.is_empty(): return
	# Only change profiles supported by the already selected species. No rerolls or RNG.
	for node in j.map.nodes:
		if node.kind != "fight": continue
		var variant = data.encounter_variant(j.expedition, node.stage)
		if variant.is_empty(): continue
		var template: Dictionary = j.get("enemies", {}).get(node.id, {})
		if not template.is_empty() and data.lookup(data.creatures, template.get("creatureId", "")).get("variants", {}).has(variant):
			if template.get("creatureVariant", "") != variant:
				template.creatureVariant = variant
				template.erase("deck")
		# The live enemy is a snapshot once cards have been dealt, including reveal/history.
		if node.stage == j.stage and not target.enemy.has("deck") and data.lookup(data.creatures, target.enemy.get("creatureId", "")).get("variants", {}).has(variant):
			target.enemy.creatureVariant = variant

func weighted(entries: Array, weights: Array):
	var sum = 0.0
	for weight in weights: sum += weight
	var cursor = combat.rng.randf() * sum
	for i in entries.size():
		cursor -= weights[i]
		if cursor < 0: return entries[i]
	return entries.back()

func sample(entries: Array):
	return entries[combat.rng.randi_range(0, entries.size() - 1)]

func fighter(name: String, stats: Dictionary, portrait_id: String = "") -> Dictionary:
	var f = {"name": name, "stats": stats.duplicate(true), "portraitId": portrait_id, "gear": {}, "skills": [], "stamina": data.balance.stamina.max}
	for slot in data.SLOTS: f.gear[slot] = null
	f.hp = data.max_hp(f)
	return f

func create(name: String, stats: Dictionary, portrait_id: String) -> String:
	if name.strip_edges().is_empty() or name.length() > 24: return "Введите имя: от 1 до 24 символов."
	var total = 0
	for key in data.STATS:
		if stats.get(key, 0) < 1 or stats[key] != int(stats[key]): return "Характеристики должны быть целыми, не ниже 1."
		total += int(stats[key])
	if total != 7: return "Распределите три очка характеристик."
	if data.lookup(data.portraits, portrait_id).is_empty(): return "Выберите портрет."
	game = {"version": 5, "player": fighter(name.strip_edges(), stats, portrait_id), "phase": "ready", "souls": 0, "wins": 0, "fight": 1, "round": 1, "log": [], "rewardOptions": []}
	new_journey(1)
	return ""

func map_layout() -> Dictionary:
	var nodes: Array = []
	var edges: Array = []
	var branches = combat.shuffled([1, 2, 3, 4]).slice(0, combat.rng.randi_range(0, 2))
	for stage in range(1, 6):
		nodes.append({"id": "fight-%d" % stage, "kind": "fight", "stage": stage, "x": combat.rng.randf_range(46, 54), "y": 92 - (stage - 1) * 21, "name": "Босс" if stage == 5 else "Противник %d" % stage})
		if stage == 5: break
		var left = combat.rng.randf() < 0.5
		for kind in ["camp", "forge"]:
			if kind == "forge" and stage not in branches: continue
			var x = combat.rng.randf_range(15, 22) if (left == (kind == "camp")) else combat.rng.randf_range(78, 85)
			var id = "%s-%d" % [kind, stage]
			nodes.append({"id": id, "kind": kind, "stage": stage, "x": x, "y": 92 - (stage - 1) * 21 - 10.5 + combat.rng.randf_range(-1.5, 1.5), "name": "Костёр" if kind == "camp" else "Кузница"})
			edges.append(["fight-%d" % stage, id])
			edges.append([id, "fight-%d" % (stage + 1)])
	return {"nodes": nodes, "edges": edges}

func new_journey(expedition: int):
	var previous = game.get("journey", {}).get("mapPreset", "")
	var pool = data.maps.filter(func(m): return m.id != previous)
	game.journey = {"expedition": expedition, "startLevel": data.level(game.player), "stage": 1, "cleared": 0, "path": ["fight-1"], "awaitingFirstBattle": true,
		"battleMode": "free" if expedition % 2 == 1 else "expendable", "mapPreset": sample(pool).id, "map": map_layout(), "enemies": {}, "offers": [], "finished": false}
	for stage in range(1, 6): game.journey.enemies["fight-%d" % stage] = generate_enemy(stage)
	game.enemy = game.journey.enemies["fight-1"].duplicate(true)
	game.player.hp = data.max_hp(game.player)
	game.player.stamina = data.balance.stamina.max
	game.phase = "ready"
	game.erase("clashPlan")
	game.erase("victoryReward")
	game.rewardOptions = []

func generate_enemy(stage: int) -> Dictionary:
	var j = game.journey
	var variant = data.encounter_variant(j.expedition, stage)
	var pool = data.creature_pool(j.expedition, variant)
	if pool.is_empty():
		push_error("Для этой встречи нет доступных существ: карта %d, этап %d, вариант %s." % [j.expedition, stage, variant])
		return {}
	var species = weighted(pool, pool.map(func(c): return c.encounter.weight))
	var rank = (1 if stage == 5 else 0) if j.expedition == 1 else maxi(1, j.startLevel + [-2, -1, -1, 0, 1][stage - 1])
	var spare = 0 if rank == 0 else rank + 2
	var stats = {"strength": 1, "agility": 1, "vitality": 1, "intelligence": 1}
	var style = sample(["berserker", "duelist", "warden"])
	var defaults = [6, 1, 3, 1] if style == "berserker" else ([1, 6, 2, 1] if style == "duelist" else [2, 1, 6, 1])
	var weights: Array = []
	for i in 4: weights.append(species.get("statWeights", {}).get(data.STATS[i], defaults[i]))
	for _point in spare: stats[weighted(data.STATS, weights)] += 1
	var f = fighter(species.name, stats, "creature:" + species.id)
	f.creatureId = species.id
	if not variant.is_empty(): f.creatureVariant = variant
	f.style = style
	if rank > 0: enemy_gear(f)
	return f

func equipment_score(f: Dictionary, equipment: Dictionary) -> float:
	if equipment.kind == "weapon":
		var affinity = 0.0
		for figure in equipment.figures:
			if figure.get("category", "") == "attack":
				for stat in figure.get("healthDamage", {}).get("stats", []): affinity += f.stats[stat] - 1
				break
		return 1 + affinity * 4 + equipment.level * 2 + equipment.tier
	var protection = 0.0
	for value in equipment.get("defense", {}).values(): protection += value
	var affinity = 0.0
	for stat in data.STATS: affinity += minf(f.stats[stat] - 1, equipment.requirements.get(stat, 1) - 1)
	return maxf(0.1, 1 + equipment.tier + protection + affinity)

func choose_equipment(f: Dictionary, pool: Array) -> Dictionary:
	var best = 0.0
	for equipment in pool: best = maxf(best, equipment_score(f, equipment))
	var eligible = pool.filter(func(i): return equipment_score(f, i) >= best * 0.7)
	return weighted(eligible, eligible.map(func(i): return equipment_score(f, i)))

func enemy_gear(f: Dictionary):
	var growth = data.stat_total(f) - 4
	var budget = mini(12, 1 + growth)
	var candidates: Array = []
	for template in data.items:
		var rank = 999 if not template.requirements.is_empty() else 1
		for stat in template.requirements: rank = mini(rank, f.stats[stat])
		var equipment = data.item("%s@%d" % [template.id, rank])
		if not equipment.get("unarmed", false) and data.can_use(f, equipment) and equipment.tier <= growth: candidates.append(equipment)
	var arms = candidates.filter(func(i): return i.kind == "weapon" and i.tier + 1 <= budget)
	if not arms.is_empty():
		var chosen = choose_equipment(f, arms)
		data.wear(f, chosen)
		budget -= int(chosen.tier) + 1
	var skipped_slots: Array = []
	var species = data.lookup(data.creatures, f.get("creatureId", ""))
	var chances: Dictionary = species.get("equipment", {}).get("generationSlotChance", {})
	for slot in chances:
		if combat.rng.randf() >= float(chances[slot]): skipped_slots.append(slot)
	while budget > 0:
		var slots: Array = []
		var weights: Array = []
		for slot in ["shield", "body", "feet", "ring", "amulet"]:
			if slot in skipped_slots or f.gear[slot] or (slot == "shield" and data.item(f.gear.weapon).get("hands", 1) == 2): continue
			var pool = candidates.filter(func(i): return i.slot == slot and i.tier + 1 <= budget)
			if not pool.is_empty():
				slots.append(pool)
				weights.append((6 if f.style == "warden" else 2) if slot == "shield" else (4 if slot == "body" else (2 if slot == "feet" else 1)))
		if slots.is_empty(): break
		var chosen = choose_equipment(f, weighted(slots, weights))
		data.wear(f, chosen)
		budget -= int(chosen.tier) + 1

func current_node() -> String:
	return game.journey.path.back()

func available_nodes() -> Array:
	if game.phase != "ready": return []
	var j = game.journey
	if j.get("awaitingFirstBattle", false): return ["fight-1"]
	if current_node().begins_with("forge") and not j.get("forgeResolved", false): return []
	var result: Array = []
	for edge in j.map.edges:
		if edge[0] == current_node() and edge[1] not in j.path: result.append(edge[1])
	return result

func travel(id: String) -> String:
	if id not in available_nodes(): return "Этот путь недоступен."
	update_journey_profiles(game)
	var node = data.lookup(game.journey.map.nodes, id)
	var j = game.journey
	if id != current_node(): j.path.append(id)
	if node.kind == "camp":
		game.player.hp = data.max_hp(game.player)
		game.player.stamina = data.balance.stamina.max
	elif node.kind == "forge": j.forgeResolved = false
	else:
		j.awaitingFirstBattle = false
		j.stage = node.stage
		game.enemy = j.enemies[id].duplicate(true)
		combat.begin(game)
	return ""

func forge(reference: String = "") -> String:
	if game.phase != "ready" or not current_node().begins_with("forge") or game.journey.get("forgeResolved", false): return "Кузница недоступна."
	if reference:
		if reference not in game.journey.offers or not data.wear(game.player, data.item(reference)): return "Предмет недоступен."
	game.journey.forgeResolved = true
	return ""

func roll_item(template: Dictionary) -> Dictionary:
	return rewards.roll_item(template, game.enemy, combat.rng)

func finish_battle():
	if game.phase == "victory":
		if game.has("victoryReward"): return
		game.wins += 1
		var j = game.journey
		var recovered = 0
		if j.get("lostSouls", {}).get("nodeId", "") == "fight-%d" % j.stage:
			recovered = int(j.lostSouls.amount)
			j.erase("lostSouls")
		j.cleared = j.stage
		j.finished = j.stage == 5
		var amount = data.level(game.enemy) + 1
		game.souls += amount + recovered
		game.victoryReward = {"shards": amount, "recoveredShards": recovered}
		game.rewardOptions = rewards.roll(game.player, game.enemy, combat.rng)
		var forge_pool: Array = []
		for template in data.items:
			var equipment = roll_item(template)
			if not equipment.get("unarmed", false) and equipment.id not in game.player.gear.values() and equipment.tier <= maxi(1, data.stat_total(game.player) - 3): forge_pool.append(equipment.id)
		j.offers = combat.shuffled(forge_pool).slice(0, 3)
	elif game.phase == "defeat":
		game.journey.lostSouls = {"nodeId": "fight-%d" % game.journey.stage, "amount": game.souls}
		game.souls = 0

func submit(placed: Array) -> String:
	var before = game.phase
	var error = combat.submit(game, placed)
	if not error and before == "combat" and game.phase != "combat": finish_battle()
	return error

func reward(index: int, slot: int = -1) -> String:
	if game.phase != "victory" or index < 0 or index >= game.rewardOptions.size(): return "Награда недоступна."
	var chosen = game.rewardOptions[index]
	if not rewards.valid(chosen, game.player): return "Награда недоступна."
	if chosen.kind == "item":
		if not data.wear(game.player, data.item(chosen.itemId)): return "Характеристик недостаточно."
	else:
		if chosen.skillId in game.player.skills: return "Навык уже изучен."
		if game.player.skills.size() >= 3:
			if slot < 0 or slot > 2: return "Выберите навык для замены."
			game.player.skills[slot] = chosen.skillId
		else: game.player.skills.append(chosen.skillId)
	game.rewardOptions = []
	return complete_reward()

func complete_reward() -> String:
	if game.phase != "victory" or not game.rewardOptions.is_empty(): return "Сначала выберите награду."
	game.phase = "ready"
	if game.journey.finished: new_journey(int(game.journey.expedition) + 1)
	return ""

func reward_requirements(index: int) -> Dictionary:
	var result = {"steps": [], "totalCost": 0, "balance": int(game.souls)}
	if game.phase != "victory" or index < 0 or index >= game.rewardOptions.size(): return result
	var option = game.rewardOptions[index]
	if option.kind != "item" or not rewards.valid(option, game.player): return result
	var equipment = data.item(option.itemId)
	var future = game.player.duplicate(true)
	for stat in data.STATS:
		var current = int(game.player.stats[stat])
		var required = int(equipment.requirements.get(stat, 0))
		if current >= required: continue
		result.steps.append({"stat": stat, "current": current, "required": required, "cost": data.level(game.player) + 2})
		for _point in range(current, required):
			result.totalCost += data.level(future) + 2
			future.stats[stat] += 1
	return result

func upgrade_reward_requirement(index: int, stat: String, expected_value: int) -> String:
	var quote = reward_requirements(index)
	if not quote.steps.any(func(step): return step.stat == stat and step.current == expected_value): return "Требования предмета изменились."
	return upgrade(stat)

func attribute_quote(increments: Dictionary) -> Dictionary:
	var result = {"error": "", "cost": 0, "points": 0, "remaining": int(game.souls), "nextCost": data.level(game.player) + 2}
	for stat in increments:
		var amount = increments[stat]
		if stat not in data.STATS or not (amount is int or amount is float) or not is_finite(float(amount)) or amount < 0 or amount > 1000000 or amount != int(amount):
			result.error = "Некорректное повышение характеристик."
			return result
		result.points += int(amount)
	# Sum the existing escalating prices, including levels clamped to zero.
	var flat_points = mini(result.points, maxi(0, 6 - data.stat_total(game.player)))
	var rising_points = result.points - flat_points
	var first_price = maxi(0, data.stat_total(game.player) + flat_points - 6) + 2
	result.cost = flat_points * 2 + rising_points * first_price + int(rising_points * (rising_points - 1) / 2)
	result.remaining -= result.cost
	result.nextCost = maxi(0, data.stat_total(game.player) + result.points - 6) + 2
	if game.phase == "combat": result.error = "Недоступно во время боя"
	elif result.remaining < 0: result.error = "Недостаточно осколков."
	return result

func upgrade_attributes(increments: Dictionary, expected_stats: Dictionary, expected_shards: int) -> String:
	if game.player.stats != expected_stats or int(game.souls) != expected_shards:
		return "Характеристики или баланс изменились. Откройте окно заново."
	var quote = attribute_quote(increments)
	if quote.error: return quote.error
	if quote.points == 0: return "Выберите повышение характеристики."
	game.souls = quote.remaining
	for stat in increments: game.player.stats[stat] += int(increments[stat])
	if increments.get("vitality", 0) > 0: game.player.hp = data.max_hp(game.player)
	return ""

func upgrade(stat: String) -> String:
	return upgrade_attributes({stat: 1}, game.player.stats.duplicate(true), int(game.souls))

func restart() -> String:
	if game.phase not in ["defeat", "draw"]: return "Повтор сейчас недоступен."
	update_journey_profiles(game)
	game.player.hp = data.max_hp(game.player)
	game.player.stamina = data.balance.stamina.max
	if game.phase == "draw":
		game.enemy = game.journey.enemies["fight-%d" % game.journey.stage].duplicate(true)
		combat.begin(game)
	else:
		game.journey.stage = 1
		game.journey.cleared = 0
		game.journey.path = ["fight-1"]
		game.journey.awaitingFirstBattle = true
		game.journey.finished = false
		game.enemy = game.journey.enemies["fight-1"].duplicate(true)
		game.phase = "ready"
		game.erase("clashPlan")
	return ""

func compress(id: String) -> String:
	if game.phase != "combat" or game.clashPlan.stage == "reveal": return "Амулет недоступен."
	var f = game.player
	var card = combat.card_by_id(f, id)
	if f.charmsUsed.amulet or data.item(f.gear.get("amulet")).get("charmEffect", "") != "compress" or card.get("shape", []).size() <= 1: return "Выберите фигуру и доступный амулет."
	f.charmsUsed.amulet = true
	game.clashPlan.playerModifiers.compressed = id
	return ""
