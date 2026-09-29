extends SceneTree
const Catalog = preload("res://game/catalog.gd")
const Session = preload("res://game/session.gd")
var checks = 0
var failed = false
var data
var variants = {}
var endings = {}
var voices = {}
const Driver = preload("res://tests/campaign_driver.gd")
const Store = preload("res://game/save_store.gd")

func check(ok: bool, label: String):
	checks += 1
	if not ok:
		failed = true
		printerr("FAIL: ", label)

func good(error: String, label: String) -> bool:
	check(error.is_empty(), label + " " + error)
	return error.is_empty()

func _initialize():
	data = Catalog.new()
	for seed_value in range(1, 13):
		var session = Session.new(data)
		session.combat.rng.seed = seed_value
		if not good(session.create("Сюжет", {"strength":2,"agility":2,"vitality":2,"intelligence":1}, data.portraits[0].id), "create"): break
		check(session.game.phase == "story", "new hero starts in prologue")
		check(session.campaign.values().voiceCapability == "silent", "initial voice silent")
		var fights = 0
		var rewards = 0
		var picked = {}
		for step in 1800:
			var g = session.game
			var runner = session.campaign
			var current = runner.node()
			var error = ""
			voices[runner.values().voiceCapability] = true
			if step % 13 == 0:
				var saved = {"game":g.duplicate(true),"rngState":str(session.combat.rng.state)}
				var restored = Session.new(data)
				check(restored.restore(saved).is_empty() and restored.game == g and restored.combat.rng.state == session.combat.rng.state, "reload at each kind of boundary")
			match g.phase:
				"story":
					check(current.get("speaker", "") != "attractor" or runner.values().voiceCapability != "silent", "silent stone has no dialogue")
					var options = runner.options()
					var selected = ""
					if not options.is_empty():
						var attempt = int(picked.get(current.id, 0))
						selected = options[(seed_value + attempt) % options.size()]
						picked[current.id] = attempt + 1
					error = session.story_advance(current.id, selected)
				"ready":
					if seed_value % 2 == 0:
						while session.attribute_quote({"strength":1}).error.is_empty():
							var cost = session.attribute_quote({"strength":1}).cost
							var old = float(g.story.state.attractorDeposits)
							check(session.upgrade("strength").is_empty() and g.story.state.attractorDeposits == old + cost, "only committed upgrade price feeds stone")
					if g.journey.has("service"): error = session.forge()
					else:
						var nodes = session.available_nodes()
						if nodes.is_empty():
							check(false, "map stuck " + str(runner.run())); break
						error = session.travel(nodes[(seed_value+step) % nodes.size()])
				"combat":
					fights += 1
					if runner.stage_for_fight(g.journey.stage).encounter.has("variants"):
						variants[current.scene + "/" + g.enemy.get("creatureId", "human")] = true
					check(current.kind == "combat", "combat owned by story")
					g.enemy.hp = 0
					g.phase = "victory"
					error = session.finish_battle()
				"victory":
					rewards += 1
					if g.rewardOptions.is_empty(): error = session.complete_reward()
					else: error = session.reward(0, 0)
				"ended": break
				_: check(false, "unexpected phase " + g.phase); break
			if not good(error, "seed %d step %d scene %s node %s" % [seed_value, step, current.scene, current.id]): break
		check(session.game.phase == "ended", "campaign terminates seed %d (%s %s)" % [seed_value, session.game.phase,session.campaign.node().id])
		endings[session.game.story.state.ending] = true
		if session.game.story.state.ending == "duty":
			check(not session.upgrade("strength").is_empty(), "handed-over stone no longer upgrades")
		check(fights == 30, "exactly 30 battles (%d)" % fights)
		check(rewards >= 30, "each battle gives a reward")
		check(session.game.journey.expedition == 6, "no seventh map")
		print("Route ",seed_value,": ",fights," battles, ", rewards," rewards, ending ",session.game.story.state.ending)
	check(endings.size() == 3, "all endings exercised")
	check(variants.size() == 4, "both alternatives at both conditional encounters exercised")
	check(voices.size() == 3, "silent, fragmentary and coherent voice exercised")
	persistence_checks()
	print("CAMPAIGN: ", checks, " checks; ", "FAIL" if failed else "PASS")
	quit(1 if failed else 0)

func persistence_checks():
	var session = Driver.new(data)
	session.combat.rng.seed = 413
	session.create("Возвращение", {"strength":2,"agility":2,"vitality":2,"intelligence":1},data.portraits[0].id)
	var route = session.game.journey.map.duplicate(true)
	var enemies = session.game.journey.enemies.duplicate(true)
	var initial_decisions = session.game.story.decisions.duplicate(true)
	# Dying before disclosure must not show the cargo or claim its name/portrait.
	session.travel("fight-1")
	session.game.souls = 9
	session.game.phase = "defeat"
	session.finish_battle()
	check(session.game.souls == 0 and session.game.story.state.unspentShardsBeforeDefeat == 9, "loss snapshot precedes removal")
	check(session.campaign.start_defeat().is_empty(), "death graph starts")
	check(session.game.phase == "story" and session.campaign.node().get("speaker", "") != "attractor", "early death hides stone")
	session.dialogues()
	check(session.game.journey.map == route and session.game.journey.enemies == enemies, "death preserves map, species, ranks and equipment")
	check(session.game.story.decisions == initial_decisions, "death preserves decisions")
	check(session.game.story.state.deathReveals == 1, "first death reveal advances once")
	session.travel("fight-1")
	session.game.phase = "victory"
	session.finish_battle()
	check(session.game.victoryReward.recoveredShards == 9 and not session.game.journey.has("lostSouls"), "lost shards recovered once")
	var shards = session.game.souls
	session.finish_battle()
	check(session.game.souls == shards, "repeat settlement does not recover twice")
	session.reward(0,0)
	if session.game.get("victoryReward", {}).get("progressionPending", false): session.complete_reward()
	check(session.game.story.state.attractorKnown, "mandatory stop reveals cargo")
	# A new zero-shard defeat overwrites the previous cache and doesn't invent a loss.
	session.travel("camp-1")
	session.travel("fight-2")
	session.game.journey.lostSouls = {"nodeId":"fight-4","amount":999}
	session.game.souls = 0
	session.game.phase = "defeat"
	session.finish_battle()
	check(session.game.story.state.unspentShardsBeforeDefeat == 0 and session.game.journey.lostSouls.amount == 0, "zero loss replaces old cache")
	var decisions = session.game.story.decisions.duplicate(true)
	session.restart()
	check(session.game.story.state.deathReveals == 2 and session.game.story.state.attractorKnown, "second death reveals cause; knowledge survives")
	check(session.game.story.decisions == decisions, "choices retained after second death")
	# Committed story reward effects and inventory are not repeatable on retries.
	for reward in data.story.rules.storyRewards:
		var node = data.story.nodes[reward.afterNode]
		session.game.phase = "story"
		session.game.story.node = node.id
		var before_shards = session.game.souls
		check(session.campaign.offer_story_reward(node), "first story reward offers once")
		var after = session.game.duplicate(true)
		check(not session.campaign.offer_story_reward(node) and session.game == after, "story reward registry blocks duplicates")
		check(session.game.souls >= before_shards, "story shards credited before choice")
	# Prices and service offers survive a reload, and failed purchases are atomic.
	session.map_fixture(2)
	var market = session.game.journey.map.nodes.filter(func(n): return n.mapPointType == "market")[0]
	session.game.story.scene = market.storyStage
	session.game.story.pendingEntry = ""
	session.campaign.seek(data.story.stages[market.storyStage].activityChoice, true)
	check(session.travel(market.id).is_empty(), "market opens configured service")
	var service = session.game.journey.service.duplicate(true)
	var reference = session.game.journey.offers[0]
	session.game.souls = 0
	var before = session.game.duplicate(true)
	check(not session.forge(reference).is_empty() and session.game == before, "unaffordable purchase leaves all state unchanged")
	var loaded = Driver.new(data)
	check(loaded.restore({"game":before,"rngState":str(session.combat.rng.state)}).is_empty() and loaded.game.journey.service == service, "market prices persist")
	loaded.game.souls = service.prices[reference]
	var deposits = loaded.game.story.state.attractorDeposits
	check(loaded.forge(reference).is_empty() and loaded.game.souls == 0 and loaded.game.story.state.attractorDeposits == deposits, "market spends price, does not feed stone")
	# Cleanup is narrowly limited to recognized legacy hero payloads.
	var folder = "user://campaign-cleanup-test"
	DirAccess.make_dir_recursive_absolute(folder)
	var store = Store.new()
	for version in [6,7,8]:
		var file = FileAccess.open(folder.path_join(str(version)+".json"),FileAccess.WRITE)
		file.store_string(JSON.stringify({"format":1,"game":{"version":version}})); file.close()
	check(store.remove_legacy(folder) == 1, "cleanup removes only pre-campaign version")
	check(not FileAccess.file_exists(folder.path_join("6.json")) and FileAccess.file_exists(folder.path_join("7.json")) and FileAccess.file_exists(folder.path_join("8.json")), "cleanup retains current and unknown future saves")
	for file in DirAccess.get_files_at(folder): DirAccess.remove_absolute(folder.path_join(file))
	DirAccess.remove_absolute(folder)
