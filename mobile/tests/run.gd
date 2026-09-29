extends SceneTree
const Catalog = preload("res://game/catalog.gd")
const Combat = preload("res://game/combat.gd")
const Session = preload("res://tests/campaign_driver.gd")
const SaveStore = preload("res://game/save_store.gd")
var checks = 0
var failures: Array = []

func check(condition: bool, description: String):
	checks += 1
	if not condition:
		failures.append(description)
		printerr("FAIL: " + description)

func close(a, b) -> bool:
	return absf(float(a) - float(b)) < 0.00001

func equivalent(a, b) -> bool:
	if (a is int or a is float) and (b is int or b is float): return close(a, b)
	if a is Dictionary and b is Dictionary:
		if a.size() != b.size(): return false
		for key in a:
			if not b.has(key) or not equivalent(a[key], b[key]): return false
		return true
	if a is Array and b is Array:
		if a.size() != b.size(): return false
		for i in a.size():
			if not equivalent(a[i], b[i]): return false
		return true
	return a == b

func _initialize():
	var data = Catalog.new()
	var combat = Combat.new(data)
	combat.rng.seed = 73129
	var oracle = JSON.parse_string(FileAccess.get_file_as_string("res://tests/fixtures/combat-reference.json"))
	if not oracle is Dictionary or oracle.get("version") != 1 or not oracle.get("decks") is Array or not oracle.get("cases") is Array:
		printerr("FAIL: Invalid combat reference fixture")
		quit(1)
		return
	if oracle.decks.is_empty() or oracle.cases.is_empty():
		printerr("FAIL: Combat reference fixture must contain decks and clashes")
		quit(1)
		return
	for n in oracle.decks.size():
		var fixture = oracle.decks[n]
		var actual = combat.build_deck(fixture.fighter)
		check(actual.size() == fixture.deck.size(), "Deck size %d" % n)
		for i in mini(actual.size(), fixture.deck.size()):
			for key in ["id", "templateId", "shape", "copies", "sourceLevel", "category", "staminaCost", "blockCost", "counter", "blocks", "healing", "evades", "name", "description", "healthDamage", "staminaDamagePerCell"]:
				check(actual[i].get(key) == fixture.deck[i].get(key), "Deck %d card %d %s" % [n, i, key])
			# Mobile also adds fallback equipment artwork; explicit figure art must match.
			if fixture.deck[i].has("art"):
				check(actual[i].get("art") == fixture.deck[i].art, "Deck %d card %d art" % [n, i])
			var parts = combat.parts(fixture.fighter, actual[i])
			check(parts.size() == fixture.parts[i].size(), "Damage part count %d/%d" % [n, i])
			for p in parts.size():
				check(parts[p].type == fixture.parts[i][p].type and close(parts[p].value, fixture.parts[i][p].value), "Damage parts %d/%d/%d" % [n, i, p])
	for n in oracle.cases.size():
		var fixture = oracle.cases[n]
		var before = JSON.stringify(fixture)
		var rng_before = combat.rng.state
		var actual = combat.calculate(fixture.fighters, fixture.moves, fixture.mods, true)
		check(before == JSON.stringify(fixture) and rng_before == combat.rng.state, "Calculation is read-only %d" % n)
		for cell in 9:
			for key in ["playerDamage", "enemyDamage", "playerStaminaDamage", "enemyStaminaDamage"]:
				check(close(actual.cells[cell][key], fixture.cells[cell][key]), "Cell %d/%d %s: %s vs %s" % [n, cell, key, actual.cells[cell][key], fixture.cells[cell][key]])
		for side in ["player", "enemy"]:
			for key in ["hpBefore", "hpAfter", "damage", "healed", "staminaBefore", "staminaLoss", "staminaAfter", "staminaRecovered", "cost", "attackCost", "blockCost", "available"]:
				check(close(actual[side][key], fixture.expected[side][key]), "Clash %d %s %s: %s vs %s" % [n, side, key, actual[side][key], fixture.expected[side][key]])
			var health_sum = 0.0
			var stamina_sum = 0.0
			for cell in actual.cells:
				health_sum += cell[side + "Damage"]
				stamina_sum += cell[side + "StaminaDamage"]
			check(close(health_sum, actual[side].damage) and close(stamina_sum, actual[side].staminaLoss), "Cell totals equal resource loss %d %s" % [n, side])
			check(actual[side].exhausted == fixture.expected[side].exhausted, "Exhaustion %d %s" % [n, side])
		check(close(combat.cost(fixture.fighters.player, fixture.moves.player, fixture.mods.player).total, fixture.blindCost.total), "Blind cost %d" % n)
	var session = Session.new(data)
	session.combat.rng.seed = 12937
	check(session.create("Test", {"strength": 2, "agility": 1, "vitality": 3, "intelligence": 1}, data.portraits[0].id).is_empty(), "Create hero")
	check(session.game.phase == "ready" and session.game.souls == 0, "Initial state")
	for stage in range(1, 5):
		check(data.stat_total(session.game.journey.enemies["fight-%d" % stage]) == 4, "First map ordinary level zero")
	check(data.stat_total(session.game.journey.enemies["fight-5"]) == 4, "First boss also has base stats")
	check(session.travel("fight-5") != "", "Reject disconnected travel")
	check(session.travel("fight-1").is_empty(), "Enter first fight")
	# A real battle played by the same placement rules on both sides.
	var turns = 0
	while session.game.phase == "combat" and turns < 160:
		var g = session.game
		var moves: Array = []
		if g.clashPlan.stage != "reveal":
			var swapped = {"player": g.enemy, "enemy": g.player, "clashPlan": {"preparer": "player" if g.clashPlan.preparer == "enemy" else "enemy", "playerPlaced": g.clashPlan.enemyPlaced, "playerModifiers": {}, "enemyModifiers": {}}}
			moves = combat.plan_ai(swapped)
		check(session.submit(moves).is_empty(), "Legal simulated turn")
		turns += 1
	check(session.game.phase != "combat", "Battle terminates")
	# Exercise victory, reward, all camps, next map and retry as explicit lifecycle fixtures.
	session.create("Lifecycle", {"strength": 2, "agility": 1, "vitality": 3, "intelligence": 1}, data.portraits[0].id)
	for stage in range(1, 6):
		check(session.travel("fight-%d" % stage).is_empty(), "Travel fight %d" % stage)
		session.game.phase = "victory"
		session.finish_battle()
		var hp = session.game.player.hp
		var shards = session.game.souls
		check(session.reward(0, 0).is_empty(), "Claim skill/item reward")
		check(session.game.souls == shards, "Choosing a reward does not change already credited shards")
		check(session.reward(0) != "", "Cannot claim reward twice")
		if session.game.get("victoryReward", {}).get("progressionPending", false):
			check(session.complete_reward().is_empty(), "Continue past optional attribute upgrade")
		if stage < 5:
			check(session.game.player.hp == hp, "Reward preserves HP")
			check(session.travel("camp-%d" % stage).is_empty(), "Camp visit")
			check(session.travel("camp-%d" % stage) != "", "Cannot replay camp")
	check(session.game.journey.expedition == 2 and session.game.journey.battleMode == "free", "Next map mode")
	var enemies = session.game.journey.enemies.duplicate(true)
	session.game.phase = "defeat"
	session.finish_battle()
	check(session.game.souls == 0 and session.restart().is_empty(), "Defeat and restart")
	check(session.game.journey.enemies == enemies, "Retry preserves enemies")
	session.travel("fight-1")
	# Preserve committed reveal and RNG across process-independent serialization.
	if session.game.clashPlan.preparer != "player":
		session.game.erase("clashPlan")
		session.game.lastReactor = "player"
		session.combat.prepare(session.game)
	check(session.submit([]).is_empty() and session.game.clashPlan.stage == "reveal", "Reveal is explicit")
	var store = SaveStore.new()
	var id = "test-" + Crypto.new().generate_random_bytes(8).hex_encode()
	check(store.write(id, session), "Write save")
	var restored = store.read(id)
	check(not restored.is_empty() and equivalent(restored.game.clashPlan, session.game.clashPlan), "Restore committed reveal")
	var other = Session.new(data)
	other.game = restored.game
	other.combat.rng.state = int(restored.rngState)
	check(session.submit([]).is_empty() and other.submit([]).is_empty(), "Resolve restored game")
	check(equivalent(session.game, other.game), "Identical resolution after reload")
	check(store.write(id, session), "Second save and backup")
	var file = FileAccess.open(store.path(id), FileAccess.WRITE)
	file.store_string("corrupt")
	file.close()
	check(not store.read(id).is_empty() and not store.error.is_empty(), "Recover backup")
	for suffix in ["", ".bak", ".tmp"]:
		if FileAccess.file_exists(store.path(id) + suffix): DirAccess.remove_absolute(store.path(id) + suffix)
	print("CHECKS: %d; FAILURES: %d; simulated battle turns: %d" % [checks, failures.size(), turns])
	quit(0 if failures.is_empty() else 1)
