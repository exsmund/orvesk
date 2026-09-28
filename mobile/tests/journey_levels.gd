extends SceneTree
## Enemy ranks and balance updates use saved map-level snapshots, never live hero levels.
const Catalog = preload("res://game/catalog.gd")
const Session = preload("res://tests/campaign_driver.gd")
const Player = preload("res://tests/first_map_player.gd")
var data = Catalog.new()
var checks = 0
var failures: Array = []

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
	for hero_level in [1,2,3,5,10,30]:
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
				var expected = 0 if chapter == 1 else maxi(1, hero_level+[-2,-2,-1,-1,0][stage-1])
				for encounter in definition.encounter.get("variants",[definition.encounter]):
					var enemy = s.generate_enemy(stage, encounter)
					check(data.level(enemy) == expected, "level chapter %d stage %d hero %d" % [chapter,stage,hero_level])
					check(enemy.get("creatureId", "") == (encounter.creatureId if encounter.kind == "creature" else ""), "keep configured species/human")
					if chapter == 1:
						check(enemy.stats.values().all(func(v): return v == 1) and enemy.hp == 30, "first map base stats and 30 HP, boss included")
						check(enemy.gear.values().all(func(v): return v == null), "no first map gear")
						if stage == 5: check(not enemy.has("creatureVariant"), "boss retains normal natural actions")
			await process_frame
	var old = Catalog.new()
	old.journey_rules = old.journey_rules.duplicate(true)
	old.journey_rules.enemyBalanceVersion = 1
	old.journey_rules.firstMap.bossRank = 1
	old.journey_rules.rankOffsets = [-2,-1,-1,0,1]
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
			var expected = 0 if chapter == 1 else maxi(1,saved.game.journey.startLevel+[-2,-2,-1,-1,0][stage-1])
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
		check(loaded.game.enemy.stats.values().all(func(v):return v==1) and loaded.game.enemy.hp == 30, "retry boss base stats")
		check(loaded.game.enemy.gear.values().all(func(v):return v==null), "retry removes old boss weapon")
		var attacks = loaded.combat.build_deck(loaded.game.enemy).filter(func(c): return c.category=="attack")
		var total = 0
		for card in attacks:
			for part in loaded.combat.parts(loaded.game.enemy,card): total += part.value*card.shape.size()
		check(total < 30, "whole first boss attack deck cannot kill a fresh 30 HP hero in one turn")
	print("JOURNEY_LEVELS: %d checks; %d failures" % [checks,failures.size()])
	quit(0 if failures.is_empty() else 1)
