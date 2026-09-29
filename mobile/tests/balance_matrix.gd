extends SceneTree
const Catalog = preload("res://game/catalog.gd")
const MemoCatalog = preload("res://tests/balance_catalog.gd")
const Scenarios = preload("res://tests/balance_scenarios.gd")
const Player = preload("res://tests/first_map_player.gd")
var data = Catalog.new()
var checks = 0
var failures: Array = []
func _initialize(): call_deferred("run")
func check(ok: bool, message: String):
	checks += 1
	if not ok:
		failures.append(message)
		printerr("FAIL: " + message)

func run():
	var suite = Scenarios.new(MemoCatalog.new())
	var cases = suite.cases()
	check(cases.size() == 1440, "12 builds × 6 levels × 10 legal loadouts × 2 enemy types")
	check(not suite.creature_ids.is_empty(), "Creature pool is derived from story encounters")
	var seen = {}
	for scenario in cases:
		check(not seen.has(scenario.id), "Unique case " + scenario.id)
		seen[scenario.id] = true
		check(data.level({"stats": scenario.stats}) == scenario.level, "Correct hero level")
		check(scenario.enemyLevel == maxi(1, scenario.level - 1), "Enemy one level lower, minimum one")
		check(scenario.stats.values().all(func(n): return n >= 1 and int(n) == n), "Integral base stats")
		check(not (scenario.hands == 2 and scenario.shield), "No impossible shield/two-handed case")
		var build = data.lookup(Scenarios.BUILDS, scenario.build)
		var others: Array = []
		for stat in data.STATS:
			if stat not in build.focus: others.append(scenario.stats[stat])
		check(others.max() - others.min() <= 1, "Remaining points evenly distributed")
		var share = float(scenario.level + 2) / build.divisor
		var expected = floori(share) if build.focus.size() > 1 else ceili(share)
		for stat in build.focus:
			check(scenario.stats[stat] - 1 == expected, "Focused stat share")
	# Seven growth points: 2 + 2 in the focused pair, 3 across the other two.
	var paired = data.lookup(Scenarios.BUILDS, "agility-vitality")
	check(suite.stats(5, paired) == {"strength": 3, "agility": 3, "vitality": 3, "intelligence": 2}, "Paired thirds keep the whole point budget")
	# Cover every stat/level/equipment category, not all expensive battles here.
	for scenario in cases:
		if scenario.enemyKind != "human": continue
		var fighters = suite.actors(scenario, 987654 + checks)
		check(not fighters.has("error"), "Actor generation: " + scenario.id)
		if fighters.has("error"): continue
		var p = fighters.player
		var e = fighters.enemy
		check(data.level(e) == scenario.enemyLevel and not e.has("creatureVariant"), "Normal lower-level enemy")
		check(p.skills.is_empty() and e.skills.is_empty(), "No learned skills")
		check(p.hp == data.max_hp(p) and e.hp == data.max_hp(e), "Full health")
		check(data.has_equipment(p, "weapon") == (scenario.hands > 0), "Weapon mode")
		check(data.has_equipment(p, "shield") == scenario.shield, "Shield mode")
		for slot in ["body", "feet"]: check(data.has_equipment(p, slot) == scenario.armor, "Armour mode")
		check(not p.gear.ring and not p.gear.amulet, "No jewellery")
		for reference in p.gear.values():
			if reference: check(data.can_use(p, data.item(reference)), "Equipment requirements")
		if scenario.hands: check(int(data.item(p.gear.weapon).hands) == scenario.hands, "Weapon handedness")
	# Memoization must reproduce full production-engine battles, including final RNG.
	var plain = Scenarios.new(data, false)
	for i in 8:
		var scenario = cases[(i * 151) % cases.size()]
		var first = "player" if i % 2 else "enemy"
		var a = suite.simulate(scenario, 777000 + i * 10, first)
		var b = plain.simulate(scenario, 777000 + i * 10, first)
		check(not a.has("error"), "Battle completes: " + scenario.id)
		check(a == b, "Memoized and production engine match: " + scenario.id)
		var again = suite.simulate(scenario, 777000 + i * 10, first)
		check(a == again, "Seed exactly reproduces battle")
		await process_frame
	cheap_moves(suite)
	print("BALANCE_MATRIX: checks=", checks, " failures=", failures.size())
	quit(1 if failures else 0)

func cheap_moves(suite):
	var scenario = suite.cases([1], [Scenarios.BUILDS[0]])[0]
	var fighters = suite.actors(scenario, 19)
	var combat = suite.session.combat
	combat.reset(fighters.player, fighters.enemy)
	for f in fighters.values(): combat.start_deck(f)
	var g = {"player": fighters.player, "enemy": fighters.enemy,
		"clashPlan": {"preparer": "player", "enemyPlaced": [], "enemyModifiers": {}}}
	# A small legal fixture exposes the old stamina<3 early-return bug directly.
	var card = {"id": "cheap-fixture", "shape": [[0,0]], "category": "attack", "staminaCost": 1,
		"healthDamage": {"base": 1, "stats": [], "types": {data.read_json("damage-types").keys()[0]: 1}}}
	g.player.deck.hand = [card]
	g.player.stamina = 1
	var moves = Player.plan(combat, g)
	check(moves.size() == 1 and combat.validate(g.player, moves).is_empty(), "Bot plays affordable attack at 1 stamina")
	g.player.stamina = 0
	check(Player.plan(combat, g).is_empty(), "Bot never overspends")
	g.player.stamina = 1
	combat.rng.seed = 62
	var before = Player.plan(combat, g)
	g.enemy.deck.hand = []
	g.clashPlan.enemyPlaced = [{"id": "hidden", "x": 0, "y": 0, "rotation": 0}]
	combat.rng.seed = 62
	check(before == Player.plan(combat, g), "Bot ignores hidden enemy hand and placement")
