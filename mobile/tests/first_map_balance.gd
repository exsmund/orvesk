extends SceneTree
const Catalog = preload("res://game/catalog.gd")
const Session = preload("res://game/session.gd")
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

func old_profiles(session):
	for f in [session.game.enemy] + session.game.journey.enemies.values(): f.erase("creatureVariant")

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
	check(pool.size() == 5, "All five first-map species support the configured profile")
	var baseline = Catalog.new()
	baseline.encounters = []
	var encountered = {}
	for seed_value in range(1, 41):
		var session = fresh(seed_value)
		var original = fresh(seed_value, baseline)
		check(session.game.journey.map == original.game.journey.map, "Profiles do not change route generation")
		for stage in range(1, 6):
			var enemy = session.game.journey.enemies["fight-%d" % stage]
			var ordinary = original.game.journey.enemies["fight-%d" % stage].duplicate(true)
			if stage < 5:
				encountered[enemy.creatureId] = true
				ordinary.creatureVariant = variant
				check(enemy.stats.values().all(func(v): return v == 1) and data.max_hp(enemy) == 30, "Introductory stats/HP")
				check(enemy.gear.values().all(func(v): return v == null) and enemy.skills.is_empty(), "Introductory enemy has no equipment/skills")
				var deck = session.combat.build_deck(enemy)
				check(deck.size() == 4, "Introductory deck contains four copies")
				for card in deck:
					check(card.get("staminaDamagePerCell", 0) == 0, "No introductory stamina damage")
					if card.category == "attack":
						check(card.shape.size() == 2 and card.staminaCost == 3, "Two-cell introductory attack costing three")
						var damage = 0.0
						for part in session.combat.parts(enemy, card): damage += part.value
						check(damage == 1, "Introductory damage per cell")
					else: check(card.shape.size() == 1, "Single-cell introductory defense")
			else:
				check(not enemy.has("creatureVariant"), "Boss keeps ordinary profile")
				check(data.level(enemy) == 1, "Boss retains level one")
			check(enemy == ordinary, "Profile is the only generation change at stage %d" % stage)
		session.new_journey(2)
		original.new_journey(2)
		check(session.game == original.game and session.combat.rng.state == original.combat.rng.state, "Next map generation/RNG completely unchanged")
	check(encountered.size() == pool.size(), "Generator reaches all five species")
	for species in pool:
		check(data.creature_figures({"creatureId": species.id}) == species.figures, "No variant means original figures")
		check(data.creature_figures({"creatureId": species.id, "creatureVariant": variant}) == species.variants[variant].figures, "Variant figures come from canonical JSON")
	# A later custom rule proves selection is based on the config, not stage/variant constants.
	var custom = Catalog.new()
	custom.encounters = [{"expedition": 3, "stages": [2], "creatureVariant": "test-profile"}]
	var a = pool[0].duplicate(true)
	var b = pool[1].duplicate(true)
	for c in [a, b]: c.variants["test-profile"] = c.variants[variant]
	a.encounter.weight = 1
	b.encounter.weight = 9
	var unsupported = pool[2].duplicate(true)
	unsupported.encounter.weight = 10000
	unsupported.erase("variants")
	var future = a.duplicate(true)
	future.encounter.minExpedition = 4
	var peaceful = a.duplicate(true)
	peaceful.encounter.combat = false
	custom.creatures = [a, b, unsupported, future, peaceful]
	var sampling = Session.new(custom)
	sampling.game = {"journey": {"expedition": 3, "startLevel": 1}}
	check(custom.creature_pool(3, "test-profile") == [a, b], "Filter variant, combat flag and minimum expedition")
	check(custom.creature_pool(3, "missing").is_empty(), "Unknown profile does not fall back to ordinary pool")
	check(custom.encounter_variant(3, 1).is_empty() and custom.encounter_variant(3, 2) == "test-profile", "Custom rule matches only its expedition/stage")
	var counts = {a.id: 0, b.id: 0}
	sampling.combat.rng.seed = 712
	for _sample in 200:
		var enemy = sampling.generate_enemy(2)
		check(enemy.creatureVariant == "test-profile" and counts.has(enemy.creatureId), "Generation uses filtered configured profile")
		counts[enemy.creatureId] += 1
	check(counts[b.id] > 150 and counts[a.id] > 0, "Weighted encounters retain the 1:9 bias")

func saved_games():
	var variant = data.encounter_variant(1, 1)
	var session = fresh()
	old_profiles(session)
	var saved = snapshot(session)
	var before = saved.duplicate(true)
	var restored = Session.new(data)
	check(restored.restore(saved).is_empty(), "Restore old ready map")
	check(saved == before, "Restore does not mutate caller payload")
	check(restored.game.journey.map == before.game.journey.map and restored.game.journey.path == before.game.journey.path, "Migration retains route/path")
	check(str(restored.combat.rng.state) == before.rngState, "Migration consumes no RNG")
	check(restored.game.enemy.creatureVariant == variant, "Unstarted current encounter receives profile")
	for stage in range(1, 6):
		var expected = before.game.journey.enemies["fight-%d" % stage].duplicate(true)
		if stage < 5: expected.creatureVariant = variant
		check(restored.game.journey.enemies["fight-%d" % stage] == expected, "Roster migration preserves species and all other fields")
	var once = restored.game.duplicate(true)
	restored.update_journey_profiles(restored.game)
	check(restored.game == once, "Migration is idempotent")
	# Unknown saved variants must not replace an existing loaded game/RNG.
	var bad = before.duplicate(true)
	bad.game.journey.enemies["fight-5"].creatureVariant = "missing"
	check("Неизвестный вариант" in restored.restore(bad), "Unknown save profile rejected visibly")
	check(restored.game == once and str(restored.combat.rng.state) == before.rngState, "Rejected load preserves current session")
	for stage in range(1, 5):
		for first in ["player", "enemy"]:
			active_save(stage, first)
	# If a selected historical species lacks the configured profile, never reroll it.
	var unsupported = Catalog.new()
	unsupported.lookup(unsupported.creatures, before.game.enemy.creatureId).erase("variants")
	var retained = Session.new(unsupported)
	check(retained.restore(before).is_empty() and retained.game.enemy == before.game.enemy, "Unsupported historical species remains unchanged")
	for expedition in [1, 2, 3]:
		var normal = fresh(67)
		if expedition > 1: normal.new_journey(expedition)
		normal.game.journey.stage = 5
		normal.game.enemy = normal.game.journey.enemies["fight-5"].duplicate(true)
		var normal_save = snapshot(normal)
		var loaded = Session.new(data)
		loaded.restore(normal_save)
		check(loaded.game == normal_save.game, "Boss/later saved profiles unchanged")

func active_save(stage: int, first: String):
	var session = fresh(stage * 91)
	old_profiles(session)
	start_fight(session, stage, first)
	# Include an actual nonempty log before the saved turn, and test the requested role again.
	session.submit([])
	if session.game.clashPlan.get("stage") == "reveal": session.submit([])
	session.game.erase("clashPlan")
	session.game.lastReactor = first
	session.combat.prepare(session.game)
	var draft = Player.plan(session.combat, session.game)
	check(not draft.is_empty(), "Active migration fixture contains a placed draft")
	var store = SaveStore.new()
	var id = "first-map-test-" + Crypto.new().generate_random_bytes(8).hex_encode()
	check(store.write(id, session, draft), "Write original-profile save")
	var bytes_before = FileAccess.get_file_as_string(store.path(id))
	var payload = store.read(id)
	var loaded = Session.new(data)
	check(loaded.restore(payload).is_empty(), "Load dealt original-profile combat")
	check(FileAccess.get_file_as_string(store.path(id)) == bytes_before, "Loading does not rewrite/delete the save")
	for field in ["enemy", "player", "clashPlan", "log", "round"]:
		check(loaded.game[field] == payload.game[field], "Active snapshot preserved: " + field)
	check(equivalent(payload.draft, draft) and str(loaded.combat.rng.state) == payload.rngState, "Draft and RNG preserved")
	# Resolve with/without migration from exactly the same committed state and RNG.
	check(session.submit(draft).is_empty() and loaded.submit(payload.draft).is_empty(), "Existing cards remain playable")
	if first == "player":
		check(loaded.game.clashPlan.stage == "reveal", "Committed reveal saved")
		check(store.write(id, loaded), "Write reveal and backup")
		var reveal_payload = store.read(id)
		var reveal_session = Session.new(data)
		check(reveal_session.restore(reveal_payload).is_empty(), "Reload reveal")
		for field in ["enemy", "player", "clashPlan", "log"]:
			check(reveal_session.game[field] == reveal_payload.game[field], "Reveal snapshot preserved: " + field)
		check(session.submit([]).is_empty() and reveal_session.submit([]).is_empty(), "Resolve retained reveal")
		loaded = reveal_session
	for field in ["enemy", "player", "clashPlan", "log", "round", "phase"]:
		check(equivalent(loaded.game.get(field), session.game.get(field)), "Identical active-turn result: " + field)
	check(loaded.combat.rng.state == session.combat.rng.state, "Identical RNG after migrated active turn")
	# Later encounters and both kinds of retry deal the new profile from the roster.
	loaded.game.phase = "victory"
	loaded.finish_battle()
	loaded.reward(0)
	loaded.game.player.hp = 1
	loaded.game.journey.path = ["fight-%d" % stage]
	check(loaded.travel("camp-%d" % stage).is_empty() and loaded.game.player.hp == 30, "Camp restores full HP without upgrading hero")
	check(loaded.travel("fight-%d" % (stage + 1)).is_empty(), "Travel to next encounter")
	check(loaded.game.enemy.get("creatureVariant", "") == data.encounter_variant(1, stage + 1), "Next fight takes configured profile; boss stays normal")
	loaded.game.phase = "defeat"
	check(loaded.restart().is_empty() and loaded.game.enemy.creatureVariant == data.encounter_variant(1, 1) and not loaded.game.enemy.has("deck"), "Restart map uses new profile without a stale deck")
	check(loaded.travel("fight-1").is_empty() and loaded.game.enemy.deck.hand.size() == 4, "Restart deals introductory deck")
	loaded.game.phase = "draw"
	check(loaded.restart().is_empty() and loaded.game.enemy.creatureVariant == data.encounter_variant(1, 1), "Draw retry uses configured profile")
	# Known-good backups retain original cards, too.
	var broken = FileAccess.open(store.path(id), FileAccess.WRITE)
	broken.store_string("corrupt")
	broken.close()
	if first == "player":
		var recovered = store.read(id)
		check(not recovered.is_empty() and not store.error.is_empty(), "Recover original-profile backup")
		check(loaded.restore(recovered).is_empty() and loaded.game.enemy == payload.game.enemy, "Backup migration preserves dealt enemy")
	for suffix in ["", ".tmp", ".bak"]:
		if FileAccess.file_exists(store.path(id) + suffix): DirAccess.remove_absolute(store.path(id) + suffix)

func start_fight(session, stage: int, first: String):
	session.game.journey.stage = stage
	session.game.journey.path = ["fight-%d" % stage]
	session.game.journey.awaitingFirstBattle = false
	session.game.enemy = session.game.journey.enemies["fight-%d" % stage].duplicate(true)
	session.combat.begin(session.game)
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
	template.portraitId = "creature:" + species.id
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
