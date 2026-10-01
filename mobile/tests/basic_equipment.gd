extends SceneTree
const Catalog = preload("res://game/catalog.gd")
const Session = preload("res://tests/campaign_driver.gd")
const SaveStore = preload("res://game/save_store.gd")
const Inspection = preload("res://ui/inspection_model.gd")
var checks = 0
var failures: Array = []

func check(ok: bool, message: String):
	checks += 1
	if not ok:
		failures.append(message)
		printerr("FAIL: " + message)

func _initialize(): call_deferred("run")

func equivalent(a, b) -> bool:
	if (a is int or a is float) and (b is int or b is float): return is_equal_approx(float(a), float(b))
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

func run():
	var data = Catalog.new()
	var session = Session.new(data)
	session.combat.rng.seed = 71
	check(session.create("Базовые предметы", {"strength":2,"agility":2,"vitality":2,"intelligence":1}, data.portraits[0].id).is_empty(), "Create hero")
	var hero = session.game.player
	var basics = data.items.filter(func(equipment): return equipment.get("unarmed", false))
	check(basics.size() == 3, "Three basic slot items")
	check(hero.gear.weapon == "fist" and hero.gear.shield == "bare-hands" and hero.gear.feet == "bare-foot", "All three equipped at creation")
	var empty = hero.duplicate(true)
	for slot in empty.gear: empty.gear[slot] = null
	check(session.combat.build_deck(hero) == session.combat.build_deck(empty), "Explicit basic gear preserves the entire original deck")
	var model = Inspection.new(data, session.combat)
	for basic in basics:
		check(data.item(basic.id + "@20").level == 1, "Basic item level stays one: " + basic.id)
		var entry = model.item(basic.id, hero, "У вас")
		check(entry.texture != null, "Basic item has shared artwork: " + basic.id)
		var expected = session.combat.figures(hero).filter(func(card): return card.get("availability", "") == basic.baseFigureAvailability)
		check(not expected.is_empty() and entry.figures == expected, "Card shows the actual combat figures: " + basic.id)
		check(not session.rewards.valid({"kind":"item", "itemId":basic.id}, empty), "Cannot claim a basic item even with a vacant slot")
		check(not session.rewards.valid({"kind":"item", "itemId":basic.id + "@20"}, empty), "Level suffix does not bypass reward restriction")
	check(session.game.journey.enemies.values().all(func(enemy): return enemy.gear.values().all(func(reference): return reference == null)), "First map enemies remain unequipped")
	for seed in 160:
		session.combat.rng.seed = seed
		for reward in session.rewards.roll(hero, session.game.enemy, session.combat.rng):
			check(reward.kind != "item" or not data.item(reward.itemId).get("unarmed", false), "No basic item in random rewards")
	for reference in session.campaign.equipment_offers(10000):
		check(not data.item(reference).get("unarmed", false), "No basic item in service/shop offers")
	# A stale or injected service offer is rejected before spending shards.
	session.game.journey.service = {"prices":{"bare-foot":1}, "next":""}
	session.game.journey.offers = ["bare-foot"]
	session.game.souls = 10
	var before = session.game.duplicate(true)
	check(not session.forge("bare-foot").is_empty() and session.game == before, "Cannot buy a basic item from a stale service offer")
	session.game.journey.erase("service")
	session.game.journey.offers = []
	var strong = hero.duplicate(true)
	for stat in data.STATS: strong.stats[stat] = 10
	check(data.wear(strong, data.item("dagger")), "Replace fist with a weapon")
	check(strong.gear.weapon == "dagger" and not session.combat.figures(strong).any(func(card): return card.get("availability", "") == "emptyWeapon"), "No fist attacks remain with a weapon")
	check(data.wear(strong, data.item("buckler")) and strong.gear.shield == "buckler", "Shield replaces bare hands")
	check(data.wear(strong, data.item("iron-boots")) and strong.gear.feet == "iron-boots", "Boots replace bare foot")
	check(not session.combat.figures(strong).any(func(card): return card.has("availability")), "All basic figures replaced once")
	check(data.wear(strong, data.item("greatsword")) and strong.gear.shield == null, "Two-handed weapon removes shield")
	check(not session.combat.figures(strong).any(func(card): return card.get("availability", "") == "emptyShield"), "No bare-hand block with two-handed weapon")
	data.equip_basics(strong)
	check(strong.gear.shield == null, "Migration never fills an occupied second hand")
	check(data.wear(strong, data.item("dagger")) and strong.gear.shield == "bare-hands", "Returning to one hand restores basic block")
	data.wear(strong, data.item("greatsword"))
	check(data.wear(strong, data.item("buckler")) and strong.gear.weapon == "fist", "A shield replacing two-handed weapon restores fist")
	for slot in ["weapon", "shield", "feet"]:
		var comparison = model.item_comparison({"weapon":"dagger", "shield":"buckler", "feet":"iron-boots"}[slot], hero, true)
		check(comparison.size() == 2 and comparison[1][0].reference == hero.gear[slot], "Comparison includes worn basic item in " + slot)
	# Restore a real dealt reveal with old empty gear without rebuilding any combat state.
	check(session.travel("fight-1").is_empty(), "Enter battle")
	# This migration fixture needs the hero to open, regardless of earlier RNG draws.
	if session.game.clashPlan.preparer != "player":
		session.game.erase("clashPlan")
		session.game.lastReactor = "player"
		session.combat.prepare(session.game)
	check(session.submit([]).is_empty() and session.game.clashPlan.stage == "reveal", "Create committed reveal")
	for basic in basics: session.game.player.gear[basic.slot] = null
	var store = SaveStore.new("/tmp/duelyant-basic-items-%d" % Time.get_ticks_usec())
	var draft: Array = [{"id":session.game.player.deck.hand[0].id, "x":0, "y":0, "rotation":0}]
	check(store.write("hero", session, draft), "Write old empty-slot save")
	var payload = store.read("hero")
	var restored = Session.new(data)
	check(restored.restore(payload).is_empty(), "Load existing hero")
	for basic in basics: check(restored.game.player.gear[basic.slot] == basic.id, "Restore basic slot: " + basic.slot)
	var expected_game = payload.game.duplicate(true)
	expected_game.player.gear = restored.game.player.gear.duplicate(true)
	check(restored.game == expected_game, "Only gear changes; deck/reveal/history/route/enemy remain identical")
	check(str(restored.combat.rng.state) == payload.rngState and equivalent(payload.draft, draft), "RNG and placement draft remain identical")
	var restored_before = restored.game.duplicate(true)
	check(restored.restore({"game":restored.game, "rngState":str(restored.combat.rng.state)}).is_empty() and restored.game == restored_before, "Migration is idempotent")
	check(session.submit([]).is_empty() and restored.submit([]).is_empty(), "Both saved reveals resolve")
	session.game.player.gear = restored.game.player.gear.duplicate(true)
	check(equivalent(session.game, restored.game), "Migrating basic items does not alter the next turn outcome")
	store.remove("hero")
	DirAccess.remove_absolute(store.folder)
	print("Basic equipment: %d checks, %d failures" % [checks, failures.size()])
	quit(0 if failures.is_empty() else 1)
