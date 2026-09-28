extends RefCounted
const Combat = preload("res://game/combat.gd")
const Rewards = preload("res://game/rewards.gd")
const Campaign = preload("res://game/campaign.gd")
const CREATION_POINTS = 3
const MIN_STARTING_STAT = 1
const MAX_NAME_LENGTH = 24
var data
var combat
var rewards
var campaign
var game: Dictionary = {}

func _init(catalog):
	data = catalog
	combat = Combat.new(data)
	rewards = Rewards.new(data)
	campaign = Campaign.new(self)

func restore(payload: Dictionary) -> String:
	var restored: Dictionary = payload.game.duplicate(true)
	if restored.get("version", 0) != data.story.rules.saveVersion or not restored.has("story"):
		return "Создайте героя для сюжетной кампании."
	if not restored.story is Dictionary: return "Повреждено сюжетное сохранение."
	var story_error = campaign.validate_saved(restored.story)
	if story_error: return story_error
	for f in [restored.player, restored.enemy] + restored.journey.get("enemies", {}).values():
		var error = data.creature_variant_error(f)
		if error: return error
	game = restored
	combat.rng.state = int(payload.rngState)
	refresh_enemy_balance()
	return ""

func refresh_enemy_balance():
	var journey = game.journey
	var revision = int(data.journey_rules.enemyBalanceVersion)
	if int(journey.get("enemyBalanceVersion", 1)) >= revision: return
	var saved_rng = combat.rng.state
	for stage in campaign.chapter(journey.expedition).stages:
		if stage.kind == "stop": continue
		var key: String = stage.engineBinding.nodeIds[0]
		if not journey.enemies.has(key): continue
		var previous: Dictionary = journey.enemies[key]
		# Reuse the saved identity and per-encounter seed, including frozen story branches.
		var encounter = {"kind": "creature" if previous.get("creatureId", "") else "human",
			"creatureId": previous.get("creatureId", ""), "role": previous.name,
			"characterId": previous.get("characterId", "")}
		combat.rng.seed = int(journey.enemySeeds[key])
		journey.enemies[key] = generate_enemy(int(stage.engineBinding.journeyStage), encounter)
		# A dealt battle (including its final result) remains a complete immutable snapshot.
		if int(stage.engineBinding.journeyStage) == int(journey.stage) and not game.enemy.has("deck"):
			game.enemy = journey.enemies[key].duplicate(true)
	combat.rng.state = saved_rng
	journey.enemyBalanceVersion = revision

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

func initial_creation_stats() -> Dictionary:
	var stats = {}
	for key in data.STATS: stats[key] = MIN_STARTING_STAT
	return stats

func creation_points_remaining(stats: Dictionary) -> int:
	return data.STATS.size() * MIN_STARTING_STAT + CREATION_POINTS - data.stat_total({"stats": stats})

func creation_name_error(name: String) -> String:
	return "Введите имя: от 1 до %d символов." % MAX_NAME_LENGTH if name.strip_edges().is_empty() or name.length() > MAX_NAME_LENGTH else ""

func create(name: String, stats: Dictionary, portrait_id: String) -> String:
	var name_error = creation_name_error(name)
	if name_error: return name_error
	for key in data.STATS:
		if stats.get(key, 0) < MIN_STARTING_STAT or stats[key] != int(stats[key]): return "Характеристики должны быть целыми, не ниже %d." % MIN_STARTING_STAT
	if creation_points_remaining(stats) != 0: return "Распределите %d очка характеристик." % CREATION_POINTS
	if data.lookup(data.portraits, portrait_id).is_empty(): return "Выберите портрет."
	game = {"version": data.story.rules.saveVersion, "player": fighter(name.strip_edges(), stats, portrait_id), "phase": "ready", "souls": 0, "wins": 0, "fight": 1, "round": 1, "log": [], "rewardOptions": []}
	game.story = campaign.initial()
	new_journey(1)
	return campaign.seek(data.story.entry)

func map_layout() -> Dictionary:
	var nodes: Array = []
	var edges: Array = []
	var chapter = campaign.chapter(game.journey.expedition)
	var stops = chapter.stages.filter(func(s): return s.kind == "stop")
	var branches = combat.shuffled(stops.map(func(s): return s.id)).slice(0, combat.rng.randi_range(data.journey_rules.forgeBranches.min, data.journey_rules.forgeBranches.max))
	for stage in chapter.stages:
		var number = int(stage.engineBinding.journeyStage)
		var y = 92.0 - (number - 1) * 84.0 / (data.journey_rules.fightsPerMap - 1)
		if stage.kind != "stop":
			nodes.append({"id": stage.engineBinding.nodeIds[0], "kind": "fight", "stage": number, "storyStage": stage.id, "mapPointType": stage.mapPointType, "x": combat.rng.randf_range(46,54), "y": y, "name": data.story.scenes[stage.id].title})
		else:
			var options: Dictionary = data.story.stages[stage.id].activityOptions
			var enabled = options.keys().filter(func(id): return options[id].get("route", "") != "forge" or stage.id in branches)
			for i in enabled.size():
				var option = options[enabled[i]]
				var point = data.map_point(option.mapPointType)
				var route = option.get("route", option.mapPointType)
				var id = "%s-%d" % [route, number]
				var x = 20.0 + 60.0 * i / maxf(1, enabled.size() - 1)
				nodes.append({"id": id, "kind": route, "stage": number, "storyStage": stage.id, "storyOption": enabled[i], "mapPointType": point.id, "x": x, "y": y - 10.5, "name": option.label})
				edges.append(["fight-%d" % number, id])
				edges.append([id, "fight-%d" % (number+1)])
	return {"nodes": nodes, "edges": edges}

func new_journey(expedition: int):
	var chapter = campaign.chapter(expedition)
	assert(not chapter.is_empty(), "Номер главы отсутствует в сценарии")
	var modes: Array = data.journey_rules.battleModes
	game.journey = {"expedition": expedition, "startLevel": data.level(game.player), "stage": 1, "cleared": 0, "path": ["fight-1"], "awaitingFirstBattle": true,
		"enemyBalanceVersion": data.journey_rules.enemyBalanceVersion,
		"battleMode": modes[(expedition-1) % modes.size()], "mapPreset": chapter.mapBinding.mapId, "enemies": {}, "enemySeeds": {}, "offers": [], "finished": false}
	game.journey.map = map_layout()
	for stage in chapter.stages:
		if stage.kind == "stop": continue
		var key: String = stage.engineBinding.nodeIds[0]
		game.journey.enemySeeds[key] = str(combat.rng.randi())
		if not stage.encounter.has("variants"): campaign.prepare_enemy(data.story.stages[stage.id])
	game.enemy = game.journey.enemies["fight-1"].duplicate(true)
	game.player.hp = data.max_hp(game.player)
	game.player.stamina = data.balance.stamina.max
	game.phase = "ready"
	game.erase("clashPlan")
	game.erase("victoryReward")
	game.erase("defeatRecorded")
	game.rewardOptions = []

func generate_enemy(stage: int, encounter: Dictionary) -> Dictionary:
	var j = game.journey
	var species: Dictionary = {}
	if encounter.kind == "creature":
		species = data.lookup(data.creatures, encounter.creatureId)
		if species.is_empty(): return {}
	var rules = data.journey_rules
	var first = rules.firstMap
	var rank = (int(first.bossRank) if stage == int(rules.bossStage) else int(first.regularRank)) if j.expedition == first.expedition else maxi(int(rules.minimumRank), j.startLevel + int(rules.rankOffsets[stage-1]))
	var spare = 0 if rank == 0 else rank + 2
	var stats = {}
	for stat in data.STATS: stats[stat] = 1
	var style: Dictionary = sample(rules.styles)
	var weights: Array = []
	for stat in data.STATS: weights.append(species.get("statWeights", {}).get(stat, style.stats[stat]))
	for _point in spare: stats[weighted(data.STATS, weights)] += 1
	var f = fighter(encounter.get("role", species.get("name", "")), stats)
	if not species.is_empty():
		f.creatureId = species.id
		var variant = data.encounter_variant(j.expedition, stage)
		if species.get("variants", {}).has(variant): f.creatureVariant = variant
	var character_id: String = encounter.get("characterId", "")
	if encounter.has("speakerId"):
		character_id = data.story.speakers.get(encounter.speakerId, {}).get("characterId", "")
	if character_id: f.characterId = character_id
	f.style = style.id
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
		for slot in data.lookup(data.journey_rules.styles, f.style).slots:
			if slot in skipped_slots or f.gear[slot] or (slot == "shield" and data.item(f.gear.weapon).get("hands", 1) == 2): continue
			var pool = candidates.filter(func(i): return i.slot == slot and i.tier + 1 <= budget)
			if not pool.is_empty():
				slots.append(pool)
				weights.append(data.lookup(data.journey_rules.styles, f.style).slots[slot])
		if slots.is_empty(): break
		var chosen = choose_equipment(f, weighted(slots, weights))
		data.wear(f, chosen)
		budget -= int(chosen.tier) + 1

func current_node() -> String:
	return game.journey.path.back()

func available_nodes() -> Array:
	return campaign.available_nodes()

func travel(id: String) -> String:
	return campaign.travel(id)

func forge(reference: String = "") -> String:
	return campaign.finish_service(reference)

func story_advance(expected: String, option: String = "") -> String:
	return campaign.advance(expected, option)

func roll_item(template: Dictionary) -> Dictionary:
	return rewards.roll_item(template, game.enemy, combat.rng)

func finish_battle() -> String:
	if game.phase == "victory":
		if game.has("victoryReward"): return ""
		game.wins += 1
		var j = game.journey
		var recovered = 0
		if j.get("lostSouls", {}).get("nodeId", "") == "fight-%d" % j.stage:
			recovered = int(j.lostSouls.amount)
			j.erase("lostSouls")
		j.cleared = j.stage
		j.finished = j.stage == int(data.journey_rules.bossStage)
		var amount = rewards.shards(game.player, j.finished)
		game.souls += amount + recovered
		game.victoryReward = {"shards": amount, "recoveredShards": recovered}
		game.rewardOptions = rewards.roll(game.player, game.enemy, combat.rng)
		return campaign.after_victory()
	elif game.phase == "defeat" and not game.get("defeatRecorded", false):
		game.story.state.unspentShardsBeforeDefeat = int(game.souls)
		game.journey.lostSouls = {"nodeId": "fight-%d" % game.journey.stage, "amount": game.souls}
		game.souls = 0
		game.defeatRecorded = true
	return ""

func submit(placed: Array) -> String:
	var before = game.phase
	var error = combat.submit(game, placed)
	if not error and before == "combat" and game.phase != "combat": return finish_battle()
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
	if not game.get("victoryReward", {}).get("progressionPending", false) and can_upgrade_attributes():
		game.get_or_add("victoryReward", {})["progressionPending"] = true
		return ""
	return campaign.after_reward()

func skip_reward() -> String:
	if game.phase != "victory" or game.rewardOptions.is_empty(): return "Награда недоступна."
	game.rewardOptions = []
	return complete_reward()

func can_upgrade_attributes() -> bool:
	var quote = attribute_quote({})
	return quote.error.is_empty() and quote.remaining >= quote.nextCost

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
	if Campaign.matches(data.story.rules.upgradesDisabledWhen, campaign.values()): result.error = "Аттрактор передан. Усиление недоступно."
	elif game.phase == "combat": result.error = "Недоступно во время боя"
	elif result.remaining < 0: result.error = "Недостаточно осколков."
	return result

func upgrade_attributes(increments: Dictionary, expected_stats: Dictionary, expected_shards: int) -> String:
	if game.player.stats != expected_stats or int(game.souls) != expected_shards:
		return "Характеристики или баланс изменились. Откройте окно заново."
	var quote = attribute_quote(increments)
	if quote.error: return quote.error
	if quote.points == 0: return "Выберите повышение характеристики."
	game.souls = quote.remaining
	game.story.state[data.story.rules.voice.depositField] += quote.cost
	for stat in increments: game.player.stats[stat] += int(increments[stat])
	if increments.get("vitality", 0) > 0: game.player.hp = data.max_hp(game.player)
	return ""

func upgrade(stat: String) -> String:
	return upgrade_attributes({stat: 1}, game.player.stats.duplicate(true), int(game.souls))

func restart() -> String:
	if game.phase not in ["defeat", "draw"]: return "Повтор сейчас недоступен."
	if game.phase == "defeat": return campaign.start_defeat()
	game.player.hp = data.max_hp(game.player)
	game.player.stamina = data.balance.stamina.max
	game.enemy = game.journey.enemies["fight-%d" % game.journey.stage].duplicate(true)
	combat.begin(game)
	return ""

func reset_chapter():
	game.player.hp = data.max_hp(game.player)
	game.player.stamina = data.balance.stamina.max
	game.journey.stage = 1
	game.journey.cleared = 0
	game.journey.path = ["fight-1"]
	game.journey.awaitingFirstBattle = true
	game.journey.finished = false
	game.journey.erase("service")
	game.enemy = game.journey.enemies["fight-1"].duplicate(true)
	game.phase = "ready"
	game.erase("clashPlan")
	game.erase("victoryReward")
	game.erase("defeatRecorded")
	game.rewardOptions = []

func compress(id: String) -> String:
	if game.phase != "combat" or game.clashPlan.stage == "reveal": return "Амулет недоступен."
	var f = game.player
	var card = combat.card_by_id(f, id)
	if f.charmsUsed.amulet or data.item(f.gear.get("amulet")).get("charmEffect", "") != "compress" or card.get("shape", []).size() <= 1: return "Выберите фигуру и доступный амулет."
	f.charmsUsed.amulet = true
	game.clashPlan.playerModifiers.compressed = id
	return ""
