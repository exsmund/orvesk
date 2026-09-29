extends RefCounted
## Test setup only. Every item, creature and fight rule comes from the live catalog.
const Session = preload("res://game/session.gd")
const Combat = preload("res://game/combat.gd")
const MemoCombat = preload("res://tests/balance_combat.gd")
const Player = preload("res://tests/first_map_player.gd")
const LEVELS = [1, 5, 10, 20, 50, 100]
const BUILDS = [
	{"id": "agility", "name": "Ловкач", "focus": ["agility"], "divisor": 1},
	{"id": "strength", "name": "Силач", "focus": ["strength"], "divisor": 1},
	{"id": "intelligence", "name": "Мудрец", "focus": ["intelligence"], "divisor": 1},
	{"id": "vitality", "name": "Здоровяк", "focus": ["vitality"], "divisor": 1},
	{"id": "half-agility", "name": "Полуловкач", "focus": ["agility"], "divisor": 2},
	{"id": "half-strength", "name": "Полусилач", "focus": ["strength"], "divisor": 2},
	{"id": "half-intelligence", "name": "Полумудрец", "focus": ["intelligence"], "divisor": 2},
	{"id": "half-vitality", "name": "Полуздоровяк", "focus": ["vitality"], "divisor": 2},
	{"id": "balanced", "name": "Баланс", "focus": [], "divisor": 1},
	{"id": "agility-vitality", "name": "Ловкач здоровяк", "focus": ["agility", "vitality"], "divisor": 3},
	{"id": "strength-vitality", "name": "Силач здоровяк", "focus": ["strength", "vitality"], "divisor": 3},
	{"id": "intelligence-vitality", "name": "Мудрец здоровяк", "focus": ["intelligence", "vitality"], "divisor": 3},
]
var data
var session
var equipment_rng = RandomNumberGenerator.new()
var planning_rng = RandomNumberGenerator.new()
var creature_ids: Array = []
var pool_cache: Dictionary = {}

func _init(catalog, memoized: bool = true):
	data = catalog
	session = Session.new(data)
	if memoized: session.combat = MemoCombat.new(data)
	for chapter in data.story.chapters:
		for stage in chapter.stages:
			if stage.kind in ["combat", "boss"]: collect_creatures(stage.encounter)
	creature_ids.sort()

func collect_creatures(encounter: Dictionary):
	if encounter.get("kind", "") == "creature":
		var id: String = encounter.creatureId
		var species = data.lookup(data.creatures, id)
		if not species.is_empty() and species.encounter.combat and id not in creature_ids:
			creature_ids.append(id)
	for variant in encounter.get("variants", []): collect_creatures(variant)

func stats(rank: int, build: Dictionary) -> Dictionary:
	var values: Dictionary = session.initial_creation_stats()
	# Follow the same level definition as Catalog.level, including creation points.
	var initial_level = data.level(values_actor_with_creation_points())
	var points = Session.CREATION_POINTS + rank - initial_level
	var remaining: Array = data.STATS.duplicate()
	# Preserve rounding up for half-builds; paired thirds round down, leaving
	# the indivisible remainder for the other two attributes.
	var share = float(points) / build.divisor
	var primary = floori(share) if build.focus.size() > 1 else ceili(share)
	for stat in build.focus:
		values[stat] += primary
		points -= primary
		remaining.erase(stat)
	# Stable catalog order breaks integer ties, identically in every fight.
	for i in points: values[remaining[i % remaining.size()]] += 1
	return values

func values_actor_with_creation_points() -> Dictionary:
	var values = session.initial_creation_stats()
	values[data.STATS[0]] += Session.CREATION_POINTS
	return {"stats": values}

func cases(levels: Array = LEVELS, builds: Array = BUILDS) -> Array:
	var result: Array = []
	for build in builds:
		for rank in levels:
			for hands in [0, 1, 2]:
				for armor in [false, true]:
					for shield in [false, true]:
						if hands == 2 and shield: continue
						for enemy in ["human", "creature"]:
							var id = "%s:L%d:h%d:a%d:s%d:%s" % [build.id, int(rank), hands, int(armor), int(shield), enemy]
							result.append({"id": id, "build": build.id, "name": build.name, "level": int(rank),
								"enemyLevel": maxi(int(data.journey_rules.minimumRank), int(rank) - 1),
								"hands": hands, "armor": armor, "shield": shield, "enemyKind": enemy,
								"stats": stats(int(rank), build)})
	return result

func choose(pool: Array):
	return pool[equipment_rng.randi_range(0, pool.size() - 1)]

func item_pool(f: Dictionary, slot: String, hands: int = 0) -> Array:
	var key = JSON.stringify(f.stats) + ":" + slot + ":" + str(hands)
	if pool_cache.has(key): return pool_cache[key]
	var templates = data.items.filter(func(i): return i.slot == slot and not i.get("unarmed", false) and (slot != "weapon" or int(i.get("hands", 1)) == hands))
	if slot == "weapon":
		# Derive offensive attributes from weapon profiles, not a hardcoded stat list.
		var offensive: Array = []
		for template in templates:
			for figure in template.figures:
				for stat in figure.get("healthDamage", {}).get("stats", []):
					if stat not in offensive: offensive.append(stat)
		var maximum = 0
		for stat in offensive: maximum = maxi(maximum, data.effective_stat(f, stat))
		templates = templates.filter(func(i):
			for figure in i.figures:
				for stat in figure.get("healthDamage", {}).get("stats", []):
					if data.effective_stat(f, stat) == maximum: return true
			return false)
	var pool: Array = []
	for template in templates:
		var rank = 1 if template.requirements.is_empty() else 999
		for stat in template.requirements: rank = mini(rank, data.effective_stat(f, stat))
		var item = data.item("%s@%d" % [template.id, rank])
		if data.can_use(f, item): pool.append(item)
	pool_cache[key] = pool
	return pool

func actors(scenario: Dictionary, seed_value: int) -> Dictionary:
	equipment_rng.seed = seed_value
	var player = session.fighter(scenario.name, scenario.stats)
	data.equip_basics(player)
	var slots: Array = []
	if scenario.hands: slots.append("weapon")
	if scenario.armor: slots.append_array(["body", "feet"])
	if scenario.shield: slots.append("shield")
	for slot in slots:
		var pool = item_pool(player, slot, scenario.hands)
		if pool.is_empty(): return {"error": "No usable equipment for " + scenario.id + ":" + slot}
		if not data.wear(player, choose(pool)): return {"error": "Cannot equip generated item"}
	var encounter = {"kind": scenario.enemyKind, "role": "Контрольный противник"}
	if scenario.enemyKind == "creature":
		if creature_ids.is_empty(): return {"error": "No combat creatures in story"}
		encounter.creatureId = choose(creature_ids)
	# Select the normal generation path and a zero-offset stage, so the engine
	# creates the requested lower rank (no post-generation edits or introductory variant).
	var rules = data.journey_rules
	var stage = 0
	for index in rules.rankOffsets.size():
		if int(rules.rankOffsets[index]) == 0:
			stage = index + 1
			break
	if stage == 0: return {"error": "No same-level encounter in journey rules"}
	session.game = {"journey": {"expedition": int(rules.firstMap.expedition) + 1, "startLevel": scenario.enemyLevel}}
	session.combat.rng.seed = seed_value + 1
	var enemy = session.generate_enemy(stage, encounter)
	if data.level(player) != scenario.level or data.level(enemy) != scenario.enemyLevel:
		return {"error": "Generated fighter level mismatch"}
	for f in [player, enemy]:
		f.hp = data.max_hp(f)
		f.stamina = data.max_stamina(f)
	return {"player": player, "enemy": enemy}

func simulate(scenario: Dictionary, seed_value: int, first: String, max_rounds: int = 500) -> Dictionary:
	var fighters = actors(scenario, seed_value)
	if fighters.has("error"): return fighters
	var combat = session.combat
	if combat is MemoCombat: combat.reset(fighters.player, fighters.enemy)
	var record = {"seed": seed_value, "first": first,
		"heroLevel": data.level(fighters.player), "enemyLevel": data.level(fighters.enemy),
		"heroStats": fighters.player.stats.duplicate(true),
		"heroGear": fighters.player.gear.duplicate(true), "enemyStats": fighters.enemy.stats.duplicate(true),
		"enemyGear": fighters.enemy.gear.duplicate(true), "creatureId": fighters.enemy.get("creatureId", ""),
		"heroHpStart": fighters.player.hp, "enemyHpStart": fighters.enemy.hp}
	var g = {"player": fighters.player, "enemy": fighters.enemy, "phase": "combat", "round": 1,
		"log": [], "journey": {"battleMode": "free"}, "lastReactor": first}
	combat.rng.seed = seed_value + 2
	for side in ["player", "enemy"]:
		g[side].battleMode = "free"
		combat.start_deck(g[side])
	combat.prepare(g)
	if g.clashPlan.preparer != first: return {"error": "Incorrect first turn"}
	planning_rng.seed = seed_value + 3
	while g.phase == "combat" and g.round <= max_rounds:
		# Give tie-breaking its own stream; do not alter game AI or deck randomness.
		var engine_rng = combat.rng.state
		combat.rng.state = planning_rng.state
		var moves = Player.plan(combat, g)
		planning_rng.state = combat.rng.state
		combat.rng.state = engine_rng
		var error = combat.submit(g, moves)
		if not error and g.phase == "combat" and g.clashPlan.stage == "reveal":
			error = combat.submit(g, [])
		if error:
			record.error = error
			break
	if g.phase == "combat" and not record.has("error"): record.error = "Round limit exceeded"
	record.outcome = g.phase
	record.rounds = g.round - 1
	record.heroHpEnd = g.player.hp
	record.enemyHpEnd = g.enemy.hp
	record.rngState = str(combat.rng.state)
	return record
