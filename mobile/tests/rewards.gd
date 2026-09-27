extends SceneTree
const Catalog = preload("res://game/catalog.gd")
const Session = preload("res://game/session.gd")
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

func _initialize():
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
	check(session.game.souls == 20 and session.game.victoryReward.shards == 1 and session.game.victoryReward.recoveredShards == 7, "Guaranteed shards plus lost cache before selection")
	var won = session.game.duplicate(true)
	var won_rng = session.combat.rng.state
	session.finish_battle()
	check(session.game == won and session.combat.rng.state == won_rng, "Repeated settlement cannot credit or reroll")
	var loaded = make_session()
	check(loaded.restore(payload(session)).is_empty() and loaded.game == won and loaded.combat.rng.state == won_rng, "Reload preserves credited shards and offers")
	check(loaded.reward(0, 0).is_empty() and loaded.game.souls == 20, "Selecting skill/item keeps shards")
	check(not loaded.reward(0).is_empty(), "Cannot claim twice")
	loaded.travel("camp-1")
	loaded.travel("fight-2")
	check(not loaded.game.has("victoryReward"), "Next battle clears previous receipt")
	loaded.game.phase = "victory"
	loaded.finish_battle()
	check(loaded.game.souls == 21, "Next victory credits independently")
	# Pending old victory keeps compatible offers and does not replay victory side effects.
	var legacy = payload(session)
	legacy.game.erase("victoryReward")
	legacy.game.souls = 12
	legacy.game.rewardOptions.push_front({"kind": "souls", "amount": 1})
	var old_options = legacy.game.rewardOptions.duplicate(true)
	check(loaded.restore(legacy).is_empty() and loaded.game.souls == 13, "Old pending victory credits old currency option")
	check(loaded.game.wins == won.wins and loaded.game.journey == won.journey, "Migration leaves route, victory count and forge offers unchanged")
	check(loaded.game.player == won.player and loaded.game.enemy == won.enemy and loaded.game.log == won.log, "Migration preserves fighters and history")
	check(loaded.combat.rng.state == won_rng and legacy.game.rewardOptions == old_options and legacy.game.souls == 12, "Migration preserves live RNG and source payload")
	check(loaded.game.rewardOptions.size() == 1 and loaded.game.rewardOptions[0] == won.rewardOptions[0], "Compatible previous offer retained")
	var migrated = payload(loaded)
	check(loaded.restore(migrated).is_empty() and loaded.game.souls == 13, "Migrated save cannot credit twice")
	var equal_legacy = legacy.duplicate(true)
	equal_legacy.game.enemy.stats = equal_legacy.game.player.stats.duplicate(true)
	var future = data.items.filter(func(i): return data.item(i.id + "@5").level == 5)[0]
	equal_legacy.game.rewardOptions = [
		{"kind":"souls", "amount":2}, {"kind":"item", "itemId":future.id + "@5"},
		{"kind":"skill", "skillId":data.skills[0].id}, {"kind":"skill", "skillId":data.skills[1].id}]
	loaded.restore(equal_legacy)
	check(loaded.game.souls == 14 and loaded.game.rewardOptions.size() == 2, "Legacy equal-level victory keeps two choices and credits currency")
	check(loaded.game.rewardOptions[0].kind == "skill" and loaded.game.rewardOptions[1].itemId == future.id + "@5", "Migration keeps usable skill plus existing future item; excludes second skill")
	check(loaded.game.rewardOptions.any(func(o): return loaded.rewards.usable(o, loaded.game.player)), "Migrated victory cannot have only locked rewards")
	for phase in ["ready", "combat", "defeat", "draw"]:
		var old = legacy.duplicate(true)
		old.game.phase = phase
		loaded.restore(old)
		check(loaded.game.souls == old.game.souls, "No retroactive shards outside pending victory: " + phase)
	# Real save/reload persists the receipt as part of the same game transaction.
	loaded.restore(migrated)
	var store = SaveStore.new()
	var id = "rewards-test-" + Crypto.new().generate_random_bytes(8).hex_encode()
	check(store.write(id, loaded), "Write migrated reward")
	var file_payload = store.read(id)
	check(session.restore(file_payload).is_empty() and session.game.souls == 13, "Disk reload does not recredit shards")
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
