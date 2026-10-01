extends SceneTree
const Catalog = preload("res://game/catalog.gd")
const Session = preload("res://game/session.gd")
const Model = preload("res://ui/inspection_model.gd")
var checks = 0
var failures: Array = []

func check(ok: bool, label: String):
	checks += 1
	if not ok:
		failures.append(label)
		printerr("FAIL: " + label)

func _initialize():
	var data = Catalog.new()
	var session = Session.new(data)
	var combat = session.combat
	var model = Model.new(data, combat)
	var f = session.fighter("Tier", {"strength":5,"agility":5,"vitality":5,"intelligence":5})
	var card = {"id":"example","category":"attack","shape":[[0,0]],"staminaCost":1,
		"sourceLevel":5,"sourceTier":0,"healthDamage":{"base":3,"stats":["strength"],"types":{"blunt":1}}}
	check(data.balance.damage.perTier == 0.1, "configured tier contribution is one tenth")
	for example in [[0,11.0,11],[1,11.4,11],[2,11.8,12],[3,12.2,12]]:
		card.sourceTier = example[0]
		check(is_equal_approx(combat.unrounded_damage(f,card),example[1]), "tier affects only level term: " + str(example[0]))
		check(combat.parts(f,card)[0].value == example[2], "round once after adding all terms")
	check(model.formula_lines(f,card)[0] == "Дробящий урон: окр(3 + (СИЛ 5 − 1) + (5 − 1) × 1.3) = 12 × 1", "inspection shows tier factor and rounding")
	card.sourceLevel = 6
	check(is_equal_approx(combat.unrounded_damage(f,card),13.5) and combat.parts(f,card)[0].value == 14, "half rounds up")
	card.sourceLevel = 1
	check(combat.parts(f,card)[0].value == 7, "tier has no level bonus at source level one")
	card.sourceLevel = 5
	card.sourceTier = 2
	card.healthDamage.stats = ["strength","agility"]
	card.healthDamage.types = {"slash":1,"magic":1}
	var parts = combat.parts(f,card)
	check(is_equal_approx(combat.unrounded_damage(f,card),20.6), "hybrid: 3 + 8 + 2 * 4 * 1.2")
	check(parts.size() == 2 and parts[0].value == 11 and parts[1].value == 10, "one rounded budget split between types, not duplicated")
	for template in data.items:
		if template.get("unarmed",false): continue
		var equipment = data.item(template.id + "@5")
		f.gear[equipment.slot] = equipment.id
		var cards = combat.figures(f).filter(func(c):return c.id.begins_with(equipment.id+":"))
		for c in cards:
			check(c.sourceTier == (equipment.tier if equipment.kind == "weapon" else 0), "only weapons inherit item tier: " + equipment.id)
			check(c.sourceLevel == equipment.level, "actual item level remains the source")
		f.gear[equipment.slot] = null
	f.gear.weapon = "hammer@5"
	combat.start_deck(f)
	var saved = JSON.parse_string(JSON.stringify(f))
	for c in saved.deck.hand:
		if c.id.begins_with("hammer@5:"):
			check(c.sourceTier == 3, "dealt source tier survives serialization")
			check(combat.parts(saved,c)[0].value == 12, "restored weapon damage retains tier")
	# Existing reference cases opt out explicitly; this is independent numeric coverage.
	data.balance.damage.perTier = 0
	check(combat.unrounded_damage(f,card) == 19, "coefficient is data driven, including zero")
	print("WEAPON_TIER: %d checks; %d failures" % [checks,failures.size()])
	quit(0 if failures.is_empty() else 1)
