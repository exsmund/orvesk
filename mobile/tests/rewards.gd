extends SceneTree
const Catalog = preload("res://game/catalog.gd")
const Session = preload("res://tests/campaign_driver.gd")
const SaveStore = preload("res://game/save_store.gd")
var data = Catalog.new()
var checks = 0
var failures: Array = []

func check(ok: bool, message: String):
	checks += 1
	if not ok:
		failures.append(message)
		printerr("FAIL: " + message)

func make_session():
	var session = Session.new(data)
	session.combat.rng.seed = 73129
	session.create("Награды", {"strength": 2, "agility": 1, "vitality": 3, "intelligence": 1}, data.portraits[0].id)
	return session

func payload(session) -> Dictionary:
	return {"game": session.game.duplicate(true), "rngState": str(session.combat.rng.state)}

func continue_progression(session):
	if session.game.get("victoryReward", {}).get("progressionPending", false):
		check(session.complete_reward().is_empty(), "Continue without spending after reward")

func check_reward_progression():
	for accepting in [false, true]:
		for delta in [-1, 0, 1]:
			var session = make_session()
			session.travel("fight-1")
			session.game.phase = "victory"
			session.finish_battle()
			var price = session.attribute_quote({}).nextCost
			session.game.souls = price + delta
			var hero = session.game.player.duplicate(true)
			var error = session.reward(0, 0) if accepting else session.skip_reward()
			check(error.is_empty() and session.game.rewardOptions.is_empty(), "Accepting or declining resolves offers")
			check(session.game.souls == price + delta, "Declining or accepting preserves awarded shards")
			if not accepting: check(session.game.player == hero, "Declining leaves gear, skills and stats untouched")
			check(session.game.get("victoryReward", {}).get("progressionPending", false) == (delta >= 0), "Prompt appears at exact next-upgrade price, not below")
			check(not session.skip_reward().is_empty() and not session.reward(0).is_empty(), "Resolved offers cannot be claimed or declined again")
			if delta < 0: continue
			var saved = payload(session)
			check(SaveStore.new().valid({"format": 1, "game": saved.game}), "Existing save format accepts progression screen")
			var loaded = make_session()
			check(loaded.restore(saved).is_empty() and loaded.game == session.game, "Post-reward screen survives restore")
			loaded.finish_battle()
			check(loaded.game == session.game, "Restore and settlement cannot recredit shards or reroll rewards")
			check(loaded.upgrade("strength").is_empty() and loaded.game.souls == delta, "Attributes can be raised from post-reward screen")
			check(not loaded.can_upgrade_attributes(), "Affordability updates after spending")
			check(loaded.complete_reward().is_empty() and loaded.game.phase != "victory", "Continue after upgrade advances story")
			continue_progression(session)
			check(session.game.souls == price + delta and session.game.phase != "victory", "Continue without upgrading does not spend shards")
			check(not session.complete_reward().is_empty(), "Cannot advance same reward twice")

func check_shard_balance():
	var session = make_session()
	# Verify affordability against the actual upgrade quote, not a second reward formula.
	for hero_level in range(1, 101):
		session.game.player.stats = {"strength": hero_level + 3, "agility": 1, "vitality": 1, "intelligence": 1}
		var price = session.attribute_quote({"strength": 1}).cost
		var two_points = session.attribute_quote({"strength": 2}).cost
		var ordinary = session.rewards.shards(session.game.player, false)
		var boss = session.rewards.shards(session.game.player, true)
		check(ordinary * 3 >= two_points and ordinary * 3 - two_points < 3, "Three wins fund +2 with only integer rounding surplus: level %d" % hero_level)
		check(ordinary * 2 < two_points, "Two ordinary wins do not already fund +2: level %d" % hero_level)
		check(boss * 2 >= price * 3 and boss * 2 - price * 3 < 2, "Boss grants 1.5 upgrade prices rounded up: level %d" % hero_level)
	for row in [[1, 3, 5], [2, 3, 6], [3, 4, 8], [5, 5, 11], [10, 9, 18], [30, 22, 48]]:
		for spend_early in [false, true]:
			session = make_session()
			session.game.player.stats = {"strength": row[0] + 3, "agility": 1, "vitality": 1, "intelligence": 1}
			var initial_strength = session.game.player.stats.strength
			for stage in range(1, 4):
				check(session.travel("fight-%d" % stage).is_empty(), "Enter balance encounter")
				session.game.phase = "victory"
				session.finish_battle()
				if not spend_early or stage == 1:
					check(session.game.victoryReward.shards == row[1], "Ordinary reward follows hero even against level-zero enemies")
				if spend_early:
					while session.attribute_quote({"strength": 1}).error.is_empty():
						check(session.upgrade("strength").is_empty(), "Buy upgrade as soon as affordable")
				session.game.rewardOptions = []
				check(session.complete_reward().is_empty(), "Finish ordinary reward")
				continue_progression(session)
				check(session.travel("camp-%d" % stage).is_empty(), "Continue after ordinary reward")
			if not spend_early:
				check(session.upgrade_attributes({"strength": 2}, session.game.player.stats.duplicate(true), int(session.game.souls)).is_empty(), "Three wins buy +2 together")
			check(session.game.player.stats.strength == initial_strength + 2, "Three wins grant exactly two affordable upgrades, saving or spending early")
		# The fourth ordinary fight must not be classified as a boss.
		session = make_session()
		session.game.player.stats = {"strength": row[0] + 3, "agility": 1, "vitality": 1, "intelligence": 1}
		for stage in [4, 5]:
			session.game.journey.path = ["camp-%d" % (stage - 1)]
			session.game.journey.cleared = stage - 1
			session.game.journey.awaitingFirstBattle = false
			session.fight_fixture(stage)
			session.game.souls = 0
			session.game.journey.lostSouls = {"nodeId": "fight-%d" % stage, "amount": 7}
			session.game.phase = "victory"
			session.finish_battle()
			var expected = row[2] if stage == 5 else row[1]
			check(session.game.victoryReward.shards == expected and session.game.souls == expected + 7, "Stage selects ordinary/boss payout; cache stays separate")
			var loaded = make_session()
			check(loaded.restore(payload(session)).is_empty() and loaded.game == session.game, "New ordinary/boss receipt survives reload")
			loaded.finish_battle()
			check(loaded.game == session.game, "Reload cannot duplicate ordinary/boss payout")
			session.game.rewardOptions = []
			check(session.complete_reward().is_empty(), "Finish final ordinary/boss reward")

func _initialize():
	check_reward_progression()
	check_shard_balance()
	var seen = {"skill": false, "item": false, "twoItems": false, "mixed": false, "future": false}
	var session = make_session()
	var profiles = [
		{"strength":1,"agility":1,"vitality":1,"intelligence":1},
		{"strength":4,"agility":1,"vitality":1,"intelligence":1},
		{"strength":1,"agility":1,"vitality":1,"intelligence":4},
		{"strength":2,"agility":2,"vitality":2,"intelligence":2},
		{"strength":8,"agility":4,"vitality":3,"intelligence":1}]
	for stats in profiles:
		var player = session.fighter("Герой", stats)
		for enemy_stats in profiles:
			var enemy = session.fighter("Враг", enemy_stats)
			for seed_value in range(40):
				session.combat.rng.seed = seed_value
				var before = player.duplicate(true)
				var options = session.rewards.roll(player, enemy, session.combat.rng)
				var expected = 1 if data.level(enemy) < data.level(player) else 2
				check(options.size() == expected, "Offer count follows levels")
				check(player == before, "Generating options does not change hero")
				check(options.all(func(o): return o.kind in ["item", "skill"]), "No currency choice")
				var skills = options.filter(func(o): return o.kind == "skill").size()
				check(skills <= 1, "At most one skill")
				check(options.any(func(o): return session.rewards.usable(o, player)), "At least one immediately usable choice")
				check(options.filter(func(o): return not session.rewards.usable(o, player)).size() <= expected - 1, "Single offer is never locked; at most one future item")
				if expected == 2:
					check(session.rewards.compatible(options[1], [options[0]]), "No duplicate item template")
					seen.twoItems = seen.twoItems or skills == 0
					seen.mixed = seen.mixed or skills == 1
				for option in options:
					seen[option.kind] = true
					seen.future = seen.future or not session.rewards.usable(option, player)
	for kind in seen: check(seen[kind], "Sample includes " + kind)
	# No new skill may repeat one the hero already knows.
	var collector = session.fighter("Коллекционер", profiles[0])
	collector.skills = data.skills.map(func(s): return s.id)
	for seed_value in range(10):
		session.combat.rng.seed = seed_value
		var options = session.rewards.roll(collector, collector, session.combat.rng)
		check(options.size() == 2 and options.all(func(o): return o.kind == "item"), "All known skills leave two item offers")
	# Victory credits currency and a recovered cache immediately, exactly once.
	session = make_session()
	session.travel("fight-1")
	session.game.souls = 12
	session.game.journey.lostSouls = {"nodeId": "fight-1", "amount": 7}
	session.game.enemy.hp = 0
	session.game.clashPlan.stage = "reveal"
	session.game.clashPlan.playerPlaced = []
	session.game.clashPlan.enemyPlaced = []
	check(session.submit([]).is_empty() and session.game.phase == "victory", "Actual submit settles a victory")
	check(session.game.souls == 22 and session.game.victoryReward.shards == 3 and session.game.victoryReward.recoveredShards == 7, "Guaranteed shards plus lost cache before selection")
	var won = session.game.duplicate(true)
	var won_rng = session.combat.rng.state
	session.finish_battle()
	check(session.game == won and session.combat.rng.state == won_rng, "Repeated settlement cannot credit or reroll")
	var loaded = make_session()
	check(loaded.restore(payload(session)).is_empty() and loaded.game == won and loaded.combat.rng.state == won_rng, "Reload preserves credited shards and offers")
	check(loaded.reward(0, 0).is_empty() and loaded.game.souls == 22, "Selecting skill/item keeps shards")
	check(not loaded.reward(0).is_empty(), "Cannot claim twice")
	continue_progression(loaded)
	loaded.travel("camp-1")
	loaded.travel("fight-2")
	check(not loaded.game.has("victoryReward"), "Next battle clears previous receipt")
	loaded.game.phase = "victory"
	loaded.finish_battle()
	check(loaded.game.souls == 25, "Next victory credits independently")
	# Pre-campaign saves are rejected without changing the loaded campaign.
	var legacy = payload(session)
	legacy.game.version = 5
	var before_legacy = loaded.game.duplicate(true)
	check(not loaded.restore(legacy).is_empty() and loaded.game == before_legacy, "Old campaign is not migrated")
	var saved = payload(session)
	# Real save/reload persists the receipt as part of the same game transaction.
	loaded.restore(saved)
	var store = SaveStore.new()
	var id = "rewards-test-" + Crypto.new().generate_random_bytes(8).hex_encode()
	check(store.write(id, loaded), "Write campaign reward")
	var file_payload = store.read(id)
	check(session.restore(file_payload).is_empty() and session.game.souls == 22, "Disk reload does not recredit shards")
	for suffix in ["", ".bak", ".tmp"]:
		if FileAccess.file_exists(store.path(id) + suffix): DirAccess.remove_absolute(store.path(id) + suffix)
	# Upgrade multiple required stats with the existing increasing progression price.
	session = make_session()
	session.travel("fight-1")
	session.game.phase = "victory"
	session.finish_battle()
	var hybrid = data.items.filter(func(i): return i.requirements.size() >= 2 and data.item(i.id + "@3").level == 3)[0]
	var future_item = data.item(hybrid.id + "@3")
	session.game.rewardOptions = [{"kind": "item", "itemId": future_item.id}]
	session.game.souls = 100
	var quote = session.reward_requirements(0)
	var full_cost = quote.totalCost
	var initial = session.game.duplicate(true)
	check(not session.reward(0).is_empty() and session.game == initial, "Locked item cannot be equipped")
	check(not session.upgrade_reward_requirement(0, "invalid", 1).is_empty(), "Only required stats can be raised from the card")
	while not quote.steps.is_empty():
		var step = quote.steps[0]
		var price = data.level(session.game.player) + 2
		var balance = session.game.souls
		check(step.cost == price and session.upgrade_reward_requirement(0, step.stat, step.current).is_empty(), "Required stat uses current progression price")
		check(session.game.souls == balance - price and session.game.player.stats[step.stat] == step.current + 1, "Upgrade deducts exactly one price")
		check(not session.upgrade_reward_requirement(0, step.stat, step.current).is_empty(), "Duplicate stale upgrade is rejected")
		check(session.game.phase == "victory" and session.game.rewardOptions == initial.rewardOptions, "Upgrading neither claims nor rerolls")
		quote = session.reward_requirements(0)
	check(session.game.souls == 100 - full_cost, "Full quote includes rising costs across stats")
	var upgraded_payload = payload(session)
	loaded.restore(upgraded_payload)
	check(loaded.reward_requirements(0).steps.is_empty() and loaded.game.souls == session.game.souls, "Purchased upgrades survive reward-screen reload")
	check(session.reward(0).is_empty() and session.game.player.gear[future_item.slot] == future_item.id, "Item becomes claimable after requirements met")
	session.game = initial.duplicate(true)
	session.game.souls = 0
	var poor = session.game.duplicate(true)
	var missing = session.reward_requirements(0).steps[0]
	check(not session.upgrade_reward_requirement(0, missing.stat, missing.current).is_empty() and session.game == poor, "Insufficient shards never change stats")
	# A catalog with no valid reward must still allow leaving the result screen.
	session.game.rewardOptions = []
	check(session.complete_reward().is_empty() and session.game.souls == poor.souls, "Empty exhausted pool can continue without losing shards")
	print("REWARDS: %s (%d checks; %d failures)" % ["PASS" if failures.is_empty() else "FAIL", checks, failures.size()])
	quit(0 if failures.is_empty() else 1)
