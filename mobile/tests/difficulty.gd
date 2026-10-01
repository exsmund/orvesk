extends SceneTree
const Catalog = preload("res://game/catalog.gd")
const Session = preload("res://game/session.gd")
const Store = preload("res://game/save_store.gd")
const Preferences = preload("res://game/preferences.gd")
var data = Catalog.new()
var checks = 0
var failures: Array = []
var stats = {"strength":2,"agility":2,"vitality":2,"intelligence":1}

func check(ok: bool, label: String):
	checks += 1
	if not ok: failures.append(label); printerr("FAIL: " + label)

func payload(s) -> Dictionary:
	return {"format":1,"game":s.game.duplicate(true),"rngState":str(s.combat.rng.state),"draft":[]}

func _initialize():
	check(not data.balance.has("enemyDamageMultiplier"), "no global difficulty coefficient")
	var locked = Session.new(data)
	check(not locked.create("Locked", stats, data.portraits[0].id, "legendary").is_empty() and locked.game.is_empty(), "legendary creation requires completion")
	for example in [["easy",0.3,3.0,0.6],["manageable",0.7,7.0,1.4],["burdensome",1.0,10.0,2.0],["legendary",1.2,12.0,2.4]]:
		var s = Session.new(data)
		check(s.create("Difficulty", stats, data.portraits[0].id, example[0], ["burdensome"]).is_empty(), "create " + example[0])
		check(s.game.enemyDamageMultiplier == example[1] and s.combat.enemy_damage_multiplier == example[1], "coefficient saved and applied")
		var p = s.fighter("Player", stats)
		var e = s.fighter("Enemy", stats)
		p.deck = {"hand":[],"draw":[],"discard":[]}
		e.deck = {"hand":[{"id":"hit","category":"attack","shape":[[0,0]],"staminaCost":1,"healthDamage":{"base":10,"stats":[],"types":{"blunt":1}},"staminaDamagePerCell":2}],"draw":[],"discard":[]}
		var calc = s.combat.calculate({"player":p,"enemy":e},{"player":[],"enemy":[{"id":"hit","x":0,"y":0,"rotation":0}]},{"player":{},"enemy":{}},true)
		check(is_equal_approx(calc.player.damage, example[2]) and is_equal_approx(calc.player.staminaLoss, example[3]), "manual health/stamina damage " + example[0])
		var loaded = Session.new(data)
		check(loaded.restore(payload(s)).is_empty() and loaded.game == s.game and loaded.combat.enemy_damage_multiplier == example[1], "restore saved coefficient " + example[0])
		data.balance.enemyDamageMultiplier = 99
		check(is_equal_approx(loaded.combat.damage_multiplier("enemy"), example[1]), "obsolete shared field cannot change a saved hero")
		data.balance.erase("enemyDamageMultiplier")
		var same_data_session = Session.new(data)
		same_data_session.create("Other", stats, data.portraits[0].id, "easy")
		check(loaded.combat.enemy_damage_multiplier == example[1], "sessions do not share difficulty")
	var old = Session.new(data)
	old.create("Old", stats, data.portraits[0].id)
	check(not old.game.skipStory and old.game.phase == "story", "first playthrough always includes the prologue")
	var first = payload(old)
	first.game.skipStory = true
	var migrated = Session.new(data)
	check(migrated.restore(first).is_empty() and not migrated.game.skipStory, "first-playthrough saves cannot skip story")
	check(migrated.game.story == old.game.story, "migration does not replay past effects")
	var saved = payload(old)
	for key in ["difficulty","enemyDamageMultiplier","skipStory","playthrough","completedDifficulties"]: saved.game.erase(key)
	var upgraded = Session.new(data)
	check(upgraded.restore(saved).is_empty() and upgraded.game.difficulty == "manageable" and upgraded.game.enemyDamageMultiplier == 0.7 and not upgraded.game.skipStory, "legacy campaign defaults without loss")
	check(upgraded.game.journey == old.game.journey and upgraded.game.player == old.game.player and upgraded.combat.rng.state == old.combat.rng.state, "migration preserves route, player and RNG")
	for bad in ["missing", ""]:
		var invalid = payload(old)
		invalid.game.difficulty = bad
		# Empty explicit profile is rejected rather than interpreted as a selection default.
		if bad.is_empty(): continue
		check(not Session.new(data).restore(invalid).is_empty(), "invalid saved profile rejected")
	for ending_index in 3:
		var normal = walk(false, ending_index)
		var skipped = walk(true, ending_index)
		check(normal.game.phase == "ended" and skipped.game.phase == "ended", "both presentation modes reach ending")
		check(normal.game.story.state == skipped.game.story.state and normal.game.story.decisions == skipped.game.story.decisions, "skipping preserves choices and effects")
		check(normal.game.story.claimedStoryRewards == skipped.game.story.claimedStoryRewards and normal.game.souls == skipped.game.souls and normal.game.wins == skipped.game.wins, "skipping preserves all rewards and battles")
		check(skipped.game.story.dialogue.entries.is_empty(), "skipped dialogue does not leak into a later choice")
		check("burdensome" in skipped.game.completedDifficulties, "any ending records hard completion")
		var pref_path = "/tmp/orvesk-difficulty-preferences-%d.cfg" % ending_index
		var prefs = Preferences.new(pref_path)
		check(prefs.record_completed(skipped.game.completedDifficulties), "persist completion achievement")
		check(data.difficulty_available("legendary", Preferences.new(pref_path).completed_difficulties), "legendary unlock survives new app preferences instance")
		for cycle in 3:
			var hero = skipped.game.player.duplicate(true)
			var souls = skipped.game.souls
			var previous_seeds = skipped.game.journey.enemySeeds.duplicate()
			hero.stats.strength = 40
			skipped.game.player.stats = hero.stats.duplicate()
			check(skipped.replay(cycle % 2 == 0).is_empty(), "replay hard and repeatedly legendary")
			check(skipped.game.difficulty == "legendary" and skipped.game.enemyDamageMultiplier == 1.2 and skipped.game.playthrough == cycle + 3, "legendary repeat has no cap")
			check(skipped.game.player.stats == hero.stats and skipped.game.player.gear == hero.gear and skipped.game.player.skills == hero.skills and skipped.game.souls == souls, "replay keeps permanent progress")
			check(skipped.game.journey.expedition == 1 and skipped.game.journey.startLevel == data.level(skipped.game.player) and skipped.game.journey.enemySeeds != previous_seeds, "replay rerolls first map from current hero level")
			check(skipped.game.journey.enemies.values().all(func(e): return data.level(e) > 1 and not e.has("creatureVariant")), "new cycle has no first-map allowances")
			check(skipped.game.story.decisions.is_empty() and skipped.game.story.claimedStoryRewards.is_empty(), "new cycle clears previous decisions and reward claims")
			check(skipped.game.player.hp == data.max_hp(skipped.game.player), "replay restores resources")
			check(not skipped.replay().is_empty(), "double replay rejected")
			var ended = data.story.nodes.values().filter(func(n):return n.kind == "end")[ending_index]
			check(skipped.campaign.seek(ended.id, true).is_empty(), "finish repeat fixture")
	var store = Store.new("/tmp/orvesk-difficulty-save-check")
	check(store.write("hero", upgraded, []) and not store.read("hero").is_empty(), "real save writes difficulty")
	var from_disk = Session.new(data)
	check(from_disk.restore(store.read("hero")).is_empty() and from_disk.game.enemyDamageMultiplier == 0.7, "real save restores difficulty")
	store.remove("hero")
	print("DIFFICULTY: %d checks; %d failures" % [checks,failures.size()])
	quit(0 if failures.is_empty() else 1)

func walk(skip: bool, ending_index: int):
	var s = Session.new(data)
	s.combat.rng.seed = 420 + ending_index
	check(s.create("Story", stats, data.portraits[0].id, "manageable").is_empty(), "create full route")
	var ending: Dictionary = data.story.nodes.values().filter(func(n): return n.kind == "end")[0]
	check(s.campaign.seek(ending.id, true).is_empty(), "prepare completed hero")
	check(s.replay(skip).is_empty() and s.game.playthrough == 2, "story option belongs to replay")
	var picked = {}
	for step in 1800:
		var g = s.game
		var node = s.campaign.node()
		var error = ""
		match g.phase:
			"story":
				check(not skip or node.kind == "choice", "skip pauses only at decisions")
				var options = s.campaign.options()
				var selected = ""
				if not options.is_empty():
					var attempt = int(picked.get(node.id, 0))
					selected = options[(ending_index + attempt) % options.size()]
					picked[node.id] = attempt + 1
				error = s.story_advance(node.id, selected)
			"ready":
				if g.journey.has("service"): error = s.forge()
				else: error = s.travel(s.available_nodes()[0])
			"combat":
				g.enemy.hp = 0
				g.phase = "victory"
				error = s.finish_battle()
			"victory": error = s.skip_reward() if not g.rewardOptions.is_empty() else s.complete_reward()
			"ended": return s
			_: check(false,"unexpected route phase"); return s
		check(error.is_empty(), "route transition: " + error)
		if error: return s
	check(false, "route did not terminate")
	return s
