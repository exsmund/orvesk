extends SceneTree
const Catalog = preload("res://game/catalog.gd")
const Session = preload("res://tests/campaign_driver.gd")
const Inspection = preload("res://ui/inspection_model.gd")
const SaveStore = preload("res://game/save_store.gd")
var data = Catalog.new()
var checks = 0
var failures: Array = []

func check(ok: bool, label: String):
	checks += 1
	if not ok: failures.append(label); printerr("FAIL: " + label)

func fresh():
	var session = Session.new(data)
	session.combat.rng.seed = 19231
	check(session.create("Броня", {"strength":2,"agility":1,"vitality":3,"intelligence":1}, data.portraits[0].id).is_empty(), "create hero")
	return session

func _initialize(): call_deferred("run")
func run():
	var original = data.items.duplicate(true)
	var armor = data.items.filter(func(value):return value.kind == "armor" and not value.get("unarmed", false))
	check(armor.filter(func(value):return value.slot == "body").size() == 30, "30 body armor templates")
	check(armor.filter(func(value):return value.slot == "feet").size() == 15, "15 footwear templates")
	var damage_types = data.read_json("damage-types")
	for template in armor:
		check(template.defense.size() >= 4, "armor protects against several threats: " + template.id)
		check(data.image(data.art.get(template.id, "")) != null, "armor has imported artwork: " + template.id)
		for type in template.defense:
			check(damage_types.has(type) and template.defense[type] > 0, "valid protection type: " + template.id)
	for template in data.items:
		if template.kind != "armor" or template.get("unarmed", false):
			check(data.item(template.id + "@10").get("defense", {}) == template.get("defense", {}), "other item defenses unchanged")
			continue
		check(template.get("defenseScalesWithLevel", false), "armor opts into levels")
		for rank in [1,2,5,10,30,999]:
			var item = data.item(template.id + "@%d" % rank)
			check(item.level == rank, "level resolves")
			check(item.requirements.values().all(func(value):return value == rank), "requirements use level")
			for type in template.defense:
				check(item.defense[type] == template.defense[type]*rank, "defense scales: %s %s %d" % [template.id,type,rank])
			check(data.item(item.id) == item, "resolving twice does not compound armor")
		check(data.item(template.id + "@0") == data.item(template.id), "legacy IDs and minimum rank")
		check(data.item(template.id + "@1000").level == 999, "maximum rank")
	check(data.items == original, "catalog templates unchanged")
	var session = fresh()
	var hero = session.game.player
	hero.skills = []
	hero.stats = {"strength":5,"agility":5,"vitality":10,"intelligence":5}
	for slot in hero.gear: hero.gear[slot] = null
	hero.hp = data.max_hp(hero)
	hero.stamina = 8
	check(data.wear(hero, data.item("plate@5")) and data.wear(hero, data.item("greaves@3")), "equip armor and boots")
	check(session.combat.armor(hero, "slash") == 31 and session.combat.armor(hero, "blunt") == 31, "defenses stack per type")
	check(session.combat.armor(hero, "poison") == 0, "no protection for missing type")
	var inspection = Inspection.new(data, session.combat)
	var card = inspection.item("plate@5", hero)
	check(card.defense.slash == 25 and card.requirements.strength == 5 and card.metadata.begins_with("Уровень 5"), "card shows actual level and defense")
	hero.stats.strength = 4
	check(not inspection.item("plate@5", hero).eligible, "requirement blocks equipment")
	hero.stats.strength = 5
	for type in ["slash", "poison"]:
		var attacker = hero.duplicate(true)
		var move = {"id":"armor-test","name":"Test","description":"","shape":[[0,0]],"category":"attack", "healthDamage":{"base":100,"stats":[],"types":{type:1}},"staminaCost":0,"staminaDamagePerCell":2}
		attacker.deck = {"hand":[move],"draw":[],"discard":[],"exchanged":false}
		hero.deck = {"hand":[],"draw":[],"discard":[],"exchanged":false}
		var result = session.combat.calculate({"player":attacker,"enemy":hero},{"player":[{"id":move.id,"x":0,"y":0,"rotation":0}],"enemy":[]},{"player":{},"enemy":{}},true)
		check(is_equal_approx(result.enemy.damage, 24.4 if type == "slash" else 100.0), "leveled armor mitigates actual damage")
		check(result.enemy.staminaLoss == 2, "armor never mitigates stamina damage")
	# Rewards and shops resolve armor through the same catalog as weapons.
	hero.gear.body = null
	hero.gear.feet = null
	var offers = session.campaign.equipment_offers(10000)
	for template in data.items.filter(func(value):return value.kind == "armor" and not value.get("unarmed", false)):
		check(offers.has(template.id + "@5"), "shop offers armor at usable rank: " + template.id)
		var rolled = session.rewards.roll_item(template, hero, session.combat.rng)
		check(rolled.level > 1 and rolled.requirements.values().all(func(value):return value == rolled.level), "loot rolls armor levels")
		var option = {"kind":"item", "itemId":template.id + "@5"}
		check(session.rewards.usable(option, hero), "armor is an eligible reward: " + template.id)
		var entry = inspection.item(option.itemId, hero, "Предлагается")
		check(entry.texture != null and entry.defense == data.item(option.itemId).defense, "inspection shares art and protection: " + template.id)
		check(entry.figures.size() == (1 if template.slot == "feet" else 0), "body has no actions; footwear retains kick: " + template.id)
	var armored_enemies = 0
	for seed_value in range(30):
		var enemy = hero.duplicate(true)
		enemy.style = data.journey_rules.styles[seed_value % data.journey_rules.styles.size()].id
		for slot in enemy.gear: enemy.gear[slot] = null
		session.combat.rng.seed = seed_value
		session.enemy_gear(enemy)
		for reference in enemy.gear.values():
			if not reference: continue
			var equipment = data.item(reference)
			if equipment.kind != "armor": continue
			armored_enemies += 1
			check(equipment.level >= 1 and equipment.level <= 5 and data.can_use(enemy, equipment), "enemy armor respects stat ceiling and may use a lower budgeted rank")
	check(armored_enemies > 0, "enemy generation includes leveled armor")
	# Old IDs stay level one; existing leveled footwear keeps its rank and gains scaled protection.
	for reference in ["plate", "plate@5"]:
		session = fresh()
		session.game.player.gear.body = reference
		session.game.player.gear.feet = "greaves@3"
		session.fight_fixture(1)
		var before = session.game.duplicate(true)
		var folder = "user://armor-level-test-" + Crypto.new().generate_random_bytes(8).hex_encode()
		var store = SaveStore.new(folder)
		check(store.write("hero", session), "write armor save")
		var payload = store.read("hero")
		var restored = fresh()
		check(restored.restore(payload).is_empty(), "restore armor save")
		check(restored.game == JSON.parse_string(JSON.stringify(before, "", false, true)), "restore preserves battle, gear, route, cards and history")
		check(restored.combat.rng.state == session.combat.rng.state, "restore preserves RNG")
		check(data.item(restored.game.player.gear.body).level == (5 if reference.contains("@") else 1), "saved armor rank remains fixed")
		check(restored.combat.armor(restored.game.player, "slash") == (31 if reference.contains("@") else 11), "saved defenses resolve by fixed rank")
		DirAccess.remove_absolute(store.path("hero"))
		DirAccess.remove_absolute(folder)
	print("ARMOR_LEVELS: %d checks; %d failures" % [checks,failures.size()])
	quit(0 if failures.is_empty() else 1)
