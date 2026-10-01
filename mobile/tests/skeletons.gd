extends SceneTree
const Catalog = preload("res://game/catalog.gd")
const Session = preload("res://tests/campaign_driver.gd")
var failures: Array = []

func check(ok: bool, message: String):
	if not ok: failures.append(message); printerr(message)

func _initialize():
	var data = Catalog.new()
	var session = Session.new(data)
	var shields = 0
	for seed in range(1, 101):
		for id in ["skeleton", "skeleton-archer"]:
			for strength in [4, 12]:
				var f = session.fighter("Тест", {"strength": strength, "agility": 1, "vitality": 1, "intelligence": 1})
				f.creatureId = id
				f.style = "duelist"
				session.combat.rng.seed = seed
				var hero = f.duplicate(true)
				hero.erase("creatureId")
				hero.gear.weapon = "shortsword@%d" % strength
				hero.gear.shield = "kite-shield@%d" % strength
				session.enemy_gear(f, hero)
				check(f.gear.weapon != null, id + ": weapon required")
				var weapon = data.item(f.gear.weapon)
				check(data.can_use(f, weapon), id + ": wearable weapon")
				if id == "skeleton-archer":
					check(weapon.templateId == "hunting-bow" and not f.gear.shield, "archer: only bow")
				else:
					check(weapon.hands == 1, "skeleton: one-handed weapon")
					if strength == 12 and f.gear.shield: shields += 1
				for slot in ["body", "feet", "ring", "amulet"]: check(not f.gear[slot], id + ": forbidden slot")
				check(session.combat.build_deck(f).any(func(card): return card.category == "attack"), id + ": attack from weapon")
	check(shields > 0 and shields < 100, "skeleton: both shield outcomes occur")
	check(not data.creature_pool(1, "introductory").any(func(c): return c.id.begins_with("skeleton")), "first map has no armed skeletons")
	print("SKELETONS: %s (%d failures)" % ["PASS" if failures.is_empty() else "FAIL", failures.size()])
	quit(0 if failures.is_empty() else 1)
