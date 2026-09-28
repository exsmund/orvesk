extends SceneTree
const Catalog = preload("res://game/catalog.gd")
const Session = preload("res://tests/campaign_driver.gd")
const SaveStore = preload("res://game/save_store.gd")
const Player = preload("res://tests/first_map_player.gd")
const HERO_STATS = {"strength": 1, "agility": 1, "vitality": 1, "intelligence": 4}
var data = Catalog.new()
var checks = 0
var failures: Array = []
var report: Array = []

func check(value: bool, description: String):
	checks += 1
	if not value:
		failures.append(description)
		printerr("FAIL: " + description)

func equivalent(a, b) -> bool:
	# JSON round trips turn integers into floats, including nested placements.
	if (a is int or a is float) and (b is int or b is float): return absf(float(a) - float(b)) < 0.00001
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

func fresh(seed_value: int = 43, catalog = data):
	var session = Session.new(catalog)
	session.combat.rng.seed = seed_value
	check(session.create("Безоружный", HERO_STATS, catalog.portraits[0].id).is_empty(), "Create balance hero")
	return session

func snapshot(session, draft: Array = []) -> Dictionary:
	return {"format": 1, "game": session.game.duplicate(true), "rngState": str(session.combat.rng.state), "draft": draft.duplicate(true)}

func _initialize(): call_deferred("run")

func run():
	var args = OS.get_cmdline_user_args()
	if "--unknown-variant" in args:
		var figures = data.creature_figures({"creatureId": data.creature_pool(1)[0].id, "creatureVariant": "missing"})
		quit(23 if figures.is_empty() else 24)
		return
	profiles_and_generation()
	saved_games()
	# The public selector must report an actual error rather than silently use normal figures.
	var diagnostics: Array = []
	var code = OS.execute(OS.get_executable_path(), ["--headless", "--path", ProjectSettings.globalize_path("res://"), "--script", "res://tests/first_map_balance.gd", "--", "--unknown-variant"], diagnostics, true)
	check(code == 23 and "Неизвестный вариант существа: missing" in "\n".join(diagnostics), "Unknown variant raises an explicit engine error")
	var samples = 1 if "--quick" in args else 10
	for species in data.creature_pool(1, data.encounter_variant(1, 1)):
		var summary = {"id": species.id, "name": species.name, "battles": 0, "wins": 0, "minHp": INF, "hpTotal": 0.0, "roundsTotal": 0, "maxRounds": 0, "first": {"player": 0, "enemy": 0}}
		for stage in range(1, 5):
			for first in ["player", "enemy"]:
				for n in range(1, samples + 1):
					var result = simulate(species, stage, stage * 1000 + n, first)
					report.append(result)
					summary.battles += 1
					summary.wins += int(result.outcome == "victory")
					summary.first[first] += 1
					summary.minHp = minf(summary.minHp, result.hp)
					summary.hpTotal += result.hp
					summary.roundsTotal += result.rounds
					summary.maxRounds = maxi(summary.maxRounds, result.rounds)
					check(result.outcome == "victory" and result.hp > 0 and result.rounds < 25, "Balance %s" % JSON.stringify(result))
			summary["meanHp"] = summary.hpTotal / summary.battles
			summary["meanRounds"] = float(summary.roundsTotal) / summary.battles
		print("BALANCE_SPECIES: " + JSON.stringify(summary))
		await process_frame
	if "--report" in args:
		var index = args.find("--report")
		var file = FileAccess.open(args[index + 1], FileAccess.WRITE)
		file.store_string(JSON.stringify({"checks": checks, "failures": failures, "battles": report}, "\t"))
		file.close()
	print("FIRST_MAP_BALANCE: %s; checks=%d; battles=%d; wins=%d; failures=%d" % ["PASS" if failures.is_empty() else "FAIL", checks, report.size(), report.filter(func(r): return r.outcome == "victory").size(), failures.size()])
	quit(0 if failures.is_empty() else 1)

func profiles_and_generation():
	var variant = data.encounter_variant(1, 1)
	var pool = data.creature_pool(1, variant)
	check(pool.size() == 5, "Five catalog variants remain available")
	for species in pool:
		check(data.creature_figures({"creatureId":species.id}) == species.figures, "Normal figures preserved")
		check(data.creature_figures({"creatureId":species.id,"creatureVariant":variant}) == species.variants[variant].figures, "Intro figures read from catalog")
	for seed_value in range(1, 21):
		var session = fresh(seed_value)
		for stage in range(1, 6):
			var definition = session.campaign.stage_for_fight(stage)
			var enemy = session.game.journey.enemies["fight-%d" % stage]
			check(enemy.get("creatureId") == definition.encounter.creatureId, "Story keeps authored human/species")
			check(enemy.stats.values().all(func(v): return v == 1) and enemy.hp == 30, "All five first chapter enemies have base stats")
			check(enemy.gear.values().all(func(v): return v == null), "No first chapter enemy gear, including boss")
			if stage < 5:
				var species = data.lookup(data.creatures, enemy.get("creatureId", ""))
				check(enemy.has("creatureVariant") == species.get("variants", {}).has(variant), "Only supported introductory variant applied")
			else: check(not enemy.has("creatureVariant") and data.level(enemy) == 0, "Boss has normal figures at base stats")
		session.map_fixture(2)
		check(session.game.journey.enemies.values().all(func(f): return not f.has("creatureVariant")), "Later chapter keeps normal figures")

func saved_games():
	for stage in range(1, 5):
		for first in ["player", "enemy"]:
			var session = fresh(stage * 91)
			start_fight(session, stage, first)
			var draft = Player.plan(session.combat, session.game)
			var saved = snapshot(session, draft)
			var restored = Session.new(data)
			check(restored.restore(saved).is_empty() and restored.game == saved.game, "Current campaign restores without changing dealt cards")
			check(restored.combat.rng.state == session.combat.rng.state, "Restored RNG exact")
			check(session.submit(draft) == restored.submit(draft) and session.game == restored.game, "Saved placement resolves identically")
			if session.game.phase == "combat" and session.game.clashPlan.stage == "reveal":
				var reveal = snapshot(session)
				check(restored.restore(reveal).is_empty() and restored.game.clashPlan == session.game.clashPlan, "Committed reveal retained")
				check(session.submit([]) == restored.submit([]) and session.game == restored.game, "Reveal calculation unchanged after reload")
			var old = saved.duplicate(true)
			old.game.version = 5
			check(not restored.restore(old).is_empty(), "Pre-campaign save rejected")

func start_fight(session, stage: int, first: String):
	session.fight_fixture(stage)
	if session.game.clashPlan.preparer != first:
		# Test fixture forces both first-player roles; production still chooses randomly.
		session.game.erase("clashPlan")
		session.game.lastReactor = first
		session.combat.prepare(session.game)
	check(session.game.clashPlan.preparer == first, "Requested first-player role")

func simulate(species: Dictionary, stage: int, seed_value: int, first: String) -> Dictionary:
	var session = fresh(seed_value)
	var template = session.game.journey.enemies["fight-%d" % stage]
	template.creatureId = species.id
	template.name = species.name
	template.creatureVariant = data.encounter_variant(1, stage)
	template.erase("characterId")
	start_fight(session, stage, first)
	var rounds = 0
	while session.game.phase == "combat" and rounds < 60:
		var error = session.submit(Player.plan(session.combat, session.game))
		check(error.is_empty(), "Control strategy uses legal placements")
		if error: break
		if session.game.phase == "combat" and session.game.clashPlan.stage == "reveal":
			check(session.submit([]).is_empty(), "Resolve control strategy reveal")
		rounds += 1
	check(session.game.player.stats == HERO_STATS and session.game.player.gear.values().all(func(v): return v == null) and session.game.player.skills.is_empty(), "Control hero remains unarmed and unupgraded")
	return {"creature": species.id, "stage": stage, "seed": seed_value, "first": first, "outcome": session.game.phase, "hp": session.game.player.hp, "rounds": session.game.round - 1}
