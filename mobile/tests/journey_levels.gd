extends SceneTree
## Enemy ranks and balance updates use saved map-level snapshots, never live hero levels.
const Catalog = preload("res://game/catalog.gd")
const Session = preload("res://tests/campaign_driver.gd")
const Player = preload("res://tests/first_map_player.gd")
var data = Catalog.new()
var checks = 0
var failures: Array = []
const EXPECTED_LEVELS = {
	1:[1,1,1,1,1], 2:[1,1,1,1,1], 3:[1,1,2,2,2], 5:[3,3,4,4,4],
	10:[8,8,8,8,9], 11:[8,8,9,9,9], 20:[16,16,17,17,18],
	30:[24,24,25,25,27], 50:[40,40,42,42,45], 100:[80,80,85,85,90]
}

func check(ok: bool, label: String):
	checks += 1
	if not ok: failures.append(label); printerr("FAIL: " + label)

func fresh(catalog = data):
	var s = Session.new(catalog)
	s.combat.rng.seed = 319
	check(s.create("Проверка", {"strength":2,"agility":2,"vitality":2,"intelligence":1}, catalog.portraits[0].id).is_empty(), "create")
	return s

func payload(s): return {"game":s.game.duplicate(true), "rngState":str(s.combat.rng.state)}

func _initialize(): call_deferred("run")
func run():
	for hero_level in EXPECTED_LEVELS:
		for chapter in range(1,7):
			var s = fresh()
			s.game.player.stats = {"strength":hero_level+3,"agility":1,"vitality":1,"intelligence":1}
			s.new_journey(chapter)
			check(s.game.journey.startLevel == hero_level, "snapshot starting level")
			var generated = s.game.journey.enemies.duplicate(true)
			s.game.player.stats.strength += 100
			check(s.game.journey.enemies == generated, "upgrading does not change existing roster")
			for stage in range(1,6):
				var definition = s.campaign.stage_for_fight(stage)
				var expected = 0 if chapter == 1 else EXPECTED_LEVELS[hero_level][stage-1]
				for encounter in definition.encounter.get("variants",[definition.encounter]):
					var enemy = s.generate_enemy(stage, encounter)
					check(data.level(enemy) == expected, "level chapter %d stage %d hero %d" % [chapter,stage,hero_level])
					check(enemy.get("creatureId", "") == (encounter.creatureId if encounter.kind == "creature" else ""), "keep configured species/human")
					if chapter == 1:
						check(enemy.stats.values().all(func(v): return v == 1) and data.max_hp(enemy) == 30, "first map base stats and max HP, boss included")
						check(enemy.hp == (15 if stage == 5 else 30), "only first boss starts at half health")
						check(enemy.gear.values().all(func(v): return v == null), "no first map gear")
						if stage == 5: check(not enemy.has("creatureVariant"), "boss retains normal natural actions")
					else:
						check(enemy.hp == data.max_hp(enemy), "later enemies start at full health")
			await process_frame
	equipment_slots()
	wounded_boss()
	var old = Catalog.new()
	old.journey_rules = old.journey_rules.duplicate(true)
	old.journey_rules.enemyBalanceVersion = 1
	old.journey_rules.firstMap.erase("bossStartingHealthFraction")
	old.journey_rules.firstMap.bossRank = 1
	old.journey_rules.rankGaps = [
		{"minimum":2,"percent":0}, {"minimum":2,"percent":0},
		{"minimum":1,"percent":0}, {"minimum":1,"percent":0}, {"minimum":0,"percent":0}]
	for chapter in [1,2,6]:
		var s = fresh(old)
		s.game.player.stats.strength += 9
		s.map_fixture(chapter)
		var saved = payload(s)
		saved.game.journey.erase("enemyBalanceVersion")
		var upgraded = fresh()
		check(upgraded.restore(saved).is_empty(), "restore previous balance")
		check(saved.game.journey.get("enemyBalanceVersion",0) == 0, "input save not mutated")
		check(upgraded.combat.rng.state == int(saved.rngState), "rebalance preserves RNG")
		check(upgraded.game.player == saved.game.player and upgraded.game.story == saved.game.story, "player and story preserved")
		check(upgraded.game.journey.map == saved.game.journey.map and upgraded.game.journey.path == saved.game.journey.path, "route preserved")
		for key in saved.game.journey.enemies:
			var before = saved.game.journey.enemies[key]
			var after = upgraded.game.journey.enemies[key]
			check(before.name == after.name and before.get("creatureId","") == after.get("creatureId","") and before.get("characterId","") == after.get("characterId",""), "saved identities retained")
			var stage = int(key.trim_prefix("fight-"))
			var expected = 0 if chapter == 1 else EXPECTED_LEVELS[int(saved.game.journey.startLevel)][stage-1]
			check(data.level(after) == expected, "saved roster receives revised levels")
		check(upgraded.game.enemy == upgraded.game.journey.enemies["fight-1"], "undealt enemy preview updated")
		var once = payload(upgraded)
		check(upgraded.restore(once).is_empty() and upgraded.game == once.game, "rebalance runs only once")
		var future = once.duplicate(true)
		future.game.journey.enemyBalanceVersion += 1
		check(upgraded.restore(future).is_empty() and upgraded.game == future.game, "future balance not downgraded")
	# Already chosen human/creature alternatives must never be selected again during migration.
	for chapter in data.story.chapters:
		for stage in chapter.stages:
			if not stage.get("encounter",{}).has("variants"): continue
			for encounter in stage.encounter.variants:
				var s = fresh(old)
				s.game.player.stats.strength += 9
				s.map_fixture(chapter.number)
				var condition = encounter.when.eq
				s.game.story.state[condition[0]] = condition[1]
				check(s.campaign.prepare_enemy(data.story.stages[stage.id]).is_empty(), "freeze conditional encounter")
				var saved = payload(s)
				var restored = fresh()
				check(restored.restore(saved).is_empty(), "restore conditional encounter")
				var key = stage.engineBinding.nodeIds[0]
				check(restored.game.journey.enemies[key].get("creatureId", "") == saved.game.journey.enemies[key].get("creatureId", ""), "frozen species preserved")
				check(restored.game.journey.enemies[key].get("characterId", "") == saved.game.journey.enemies[key].get("characterId", ""), "frozen portrait preserved")
				check(restored.game.story == saved.game.story, "story choice preserved")
	# Preserve dealt cards, first-player role, placements, result and RNG; retry uses new profile.
	for reveal in [false,true]:
		var s = fresh(old)
		s.fight_fixture(5)
		s.game.erase("clashPlan");s.game.lastReactor = "player";s.combat.prepare(s.game)
		if reveal: check(s.submit(Player.plan(s.combat,s.game)).is_empty(), "old boss reveal")
		var saved = payload(s)
		var loaded = fresh()
		check(loaded.restore(saved).is_empty(), "restore dealt old boss")
		for field in ["enemy","player","clashPlan","log","story","round","phase","souls"]:
			check(loaded.game[field] == saved.game[field], "battle snapshot preserved: " + field)
		check(data.level(loaded.game.journey.enemies["fight-5"]) == 0, "future boss profile updated")
		check(loaded.combat.rng.state == int(saved.rngState), "dealt fight RNG preserved")
		if reveal:
			check(s.submit([]) == loaded.submit([]), "committed reveal resolves")
			check(s.game.enemy == loaded.game.enemy and s.game.player == loaded.game.player and s.game.log == loaded.game.log, "reveal result unchanged")
		loaded.game.phase = "defeat"
		loaded.finish_battle()
		check(loaded.restart().is_empty(), "restart after defeat")
		loaded.fight_fixture(5)
		check(loaded.game.enemy.stats.values().all(func(v):return v==1) and loaded.game.enemy.hp == 15 and data.max_hp(loaded.game.enemy) == 30, "retry boss base stats and configured wound")
		check(loaded.game.enemy.gear.values().all(func(v):return v==null), "retry removes old boss weapon")
		var attacks = loaded.combat.build_deck(loaded.game.enemy).filter(func(c): return c.category=="attack")
		var total = 0
		for card in attacks:
			for part in loaded.combat.parts(loaded.game.enemy,card): total += part.value*card.shape.size()
		check(total < 30, "whole first boss attack deck cannot kill a fresh 30 HP hero in one turn")
	print("JOURNEY_LEVELS: %d checks; %d failures" % [checks,failures.size()])
	quit(0 if failures.is_empty() else 1)

func wounded_boss():
	# The field controls HP independently of stats, and omitted fields preserve full HP.
	for fraction in [null, 0.25, 0.5, 1.0]:
		var custom = Catalog.new()
		custom.journey_rules = custom.journey_rules.duplicate(true)
		if fraction == null: custom.journey_rules.firstMap.erase("bossStartingHealthFraction")
		else: custom.journey_rules.firstMap.bossStartingHealthFraction = fraction
		var s = fresh(custom)
		var expected_hp = 30 if fraction == null else (8 if fraction == 0.25 else (15 if fraction == 0.5 else 30))
		check(s.game.journey.enemies["fight-5"].hp == expected_hp, "boss starting fraction comes from config: " + str(fraction))
		check(s.game.journey.enemies["fight-4"].hp == 30, "fraction does not wound regular enemies")
		s.fight_fixture(5)
		check(s.game.enemy.hp == expected_hp and custom.max_hp(s.game.enemy) == 30, "combat entry preserves wound and maximum")
		s.game.enemy.hp = 3
		var saved = payload(s)
		var loaded = fresh(custom)
		check(loaded.restore(saved).is_empty() and loaded.game.enemy.hp == 3, "loading current battle does not apply fraction again")
		loaded.game.phase = "draw"
		check(loaded.restart().is_empty() and loaded.game.enemy.hp == expected_hp, "draw retries with configured initial health")
		loaded.game.phase = "defeat"
		loaded.finish_battle()
		check(loaded.restart().is_empty(), "death restarts chapter")
		loaded.fight_fixture(5)
		check(loaded.game.enemy.hp == expected_hp, "chapter retry uses wounded cached profile")
		loaded.fight_fixture(5)
		check(loaded.game.enemy.hp == expected_hp, "repeated battle entry does not halve health again")
	# Saves created under balance v2 had a full-health boss even at base stats.
	var previous = Catalog.new()
	previous.journey_rules = previous.journey_rules.duplicate(true)
	previous.journey_rules.enemyBalanceVersion = 2
	previous.journey_rules.firstMap.erase("bossStartingHealthFraction")
	for active in [false, true]:
		var s = fresh(previous)
		if active: s.fight_fixture(5)
		else:
			s.game.journey.stage = 5
			s.game.enemy = s.game.journey.enemies["fight-5"].duplicate(true)
		var saved = payload(s)
		var loaded = fresh()
		check(loaded.restore(saved).is_empty(), "restore full-health v2 boss")
		check(loaded.game.journey.enemies["fight-5"].hp == 15, "v2 cached boss receives wound")
		check(loaded.game.enemy.hp == (30 if active else 15), "only undealt v2 enemy changes immediately")
		if active: check(loaded.game.enemy == saved.game.enemy, "active v2 boss snapshot preserved")
		check(loaded.combat.rng.state == int(saved.rngState), "wound migration preserves RNG")
		var once = payload(loaded)
		check(loaded.restore(once).is_empty() and loaded.game == once.game, "wound migration is idempotent")

func equipment_slots():
	var s = fresh()
	s.game.player.stats = {"strength":15,"agility":15,"vitality":15,"intelligence":15}
	s.game.player.gear.weapon = "shortsword@5"
	s.game.player.gear.body = "rags@3"
	s.game.player.gear.shield = "kite-shield@2"
	s.game.player.gear.feet = "greaves@4"
	for rank in [1,3,6,10,30]:
		s.game.journey.expedition = 2
		s.game.journey.startLevel = rank
		for seed_value in range(12):
			for encounter in [{"kind":"human","role":"Test"}] + data.creature_pool(6).map(func(c): return {"kind":"creature","creatureId":c.id}):
				s.combat.rng.seed = seed_value
				var f = s.generate_enemy(5, encounter)
				for slot in data.SLOTS:
					var reference = f.gear[slot]
					if not reference: continue
					var item = data.item(reference)
					check(data.can_use(f, item), "Generated item respects requirements and species")
					check(item.level <= data.level(s.game.player), "Generated item never exceeds hero level")
					check(s.game.player.gear[slot] != null, "Every slot requires corresponding hero item")
					var ceiling = data.item(s.game.player.gear[slot])
					check(item.level <= ceiling.level and item.tier <= ceiling.tier, "Independent slot level and tier caps")
				check(not (data.item(f.gear.weapon).get("hands",1) == 2 and f.gear.shield), "No shield with two-handed weapon")
