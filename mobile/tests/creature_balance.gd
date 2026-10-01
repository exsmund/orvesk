extends SceneTree
## Hand-calculated natural-level and multiplier cases; real generation slot checks.
const Catalog = preload("res://game/catalog.gd")
const Session = preload("res://tests/campaign_driver.gd")
var checks = 0
var failures: Array = []

func check(ok: bool, label: String):
	checks += 1
	if not ok:
		failures.append(label)
		printerr("FAIL: " + label)

func fixture_card(id: String, stat: String) -> Dictionary:
	return {"id":id,"category":"attack","shape":[[0,0]],"copies":2,"staminaCost":1,
		"naturalLevel":true,"healthDamage":{"base":3,"stats":[stat],"types":{"blunt":1}}}

func _initialize():
	var data = Catalog.new()
	var session = Session.new(data)
	var combat = session.combat
	for species in data.creatures:
		check(species.has("damageMultiplier") and species.damageMultiplier == 1.0, "neutral initial species coefficient: " + species.id)
	var species = {"id":"budget-fixture","figures":[fixture_card("primary","strength"),fixture_card("secondary","agility")],
		"damageMultiplier":0.5,"equipment":{"slots":[]}}
	data.creatures.append(species)
	var f = session.fighter("Natural", {"strength":50,"agility":2,"vitality":1,"intelligence":1})
	f.creatureId = species.id
	f.naturalWeaponLevel = 3
	var cards = combat.figures(f)
	check(cards[0].sourceLevel == 3 and cards[1].sourceLevel == 2, "each profile limited by allocated level and its own requirements")
	check(combat.parts(f,cards[0])[0].value == 54, "3 + (50 - 1) + (3 - 1) = 54, not 101")
	f.stats.strength += 20
	check(combat.figures(f)[0].sourceLevel == 3, "stat increase does not upgrade allocated weapon")
	f.erase("naturalWeaponLevel")
	check(combat.figures(f)[0].sourceLevel == 1, "no implicit free level from stats")
	var hero = session.fighter("Hero", {"strength":12,"agility":12,"vitality":12,"intelligence":12})
	for loadout in [{}, {"weapon":"dagger@2","body":"rags@3"},
		{"weapon":"shortsword@4","body":"plate@4","shield":"kite-shield@3","feet":"greaves@2"},
		{"weapon":"dagger@2","feet":"wanderer-boots@5","shield":"buckler"}]:
		for slot in hero.gear: hero.gear[slot] = loadout.get(slot)
		for seed_value in range(6):
			for entry in data.creatures.filter(func(c):return c.get("encounter",{}).get("combat",false)) + [{}]:
				var e = session.fighter("Generated", {"strength":55,"agility":35,"vitality":80,"intelligence":55})
				if not entry.is_empty(): e.creatureId = entry.id
				combat.rng.seed = seed_value
				session.enemy_gear(e,hero)
				if e.has("naturalWeaponLevel"):
					var weapon = data.item(hero.gear.weapon)
					check(e.naturalWeaponLevel <= weapon.level and e.naturalWeaponTier <= weapon.tier, "natural weapon follows hero weapon")
					for c in combat.figures(e):
						if c.get("naturalLevel",false): check(c.sourceTier == e.naturalWeaponTier, "natural tier reaches the actual deck")
				for slot in data.SLOTS:
					var reference = e.gear[slot]
					if not reference: continue
					var item = data.item(reference)
					check(item.level <= data.level(hero) and data.can_use(e,item), "items respect hero rank and species requirements")
					check(hero.gear[slot] != null, "every slot exists only with a hero item")
					var worn = data.item(hero.gear[slot])
					check(item.tier <= worn.tier and item.level <= worn.level, "each slot obeys its own level and tier cap")
					if slot in ["shield","feet"]:
						for c in combat.figures(e):
							if c.id.begins_with(item.id + ":"):
								check(c.sourceLevel == item.level and c.sourceLevel <= worn.level, "shield/boot attacks inherit capped item level")
				if entry.is_empty():
					check((e.gear.feet != null) == loadout.has("feet"), "boots present only with hero boots")
					var can_shield = loadout.has("shield") and data.item(e.gear.weapon).get("hands",1) == 1
					check((e.gear.shield != null) == can_shield, "shield requires hero shield and a free hand")
					check((e.gear.body != null) == loadout.has("body"), "body presence mirrors hero even at high health")
	# Basic fist, kick and arm-block do not unlock ordinary enemy equipment.
	for slot in hero.gear: hero.gear[slot] = null
	data.equip_basics(hero)
	var human = session.fighter("Empty", hero.stats)
	session.enemy_gear(human,hero)
	check(human.gear.values().all(func(v):return v == null), "basic items do not grant weapons, body armor, shields or boots")
	# Hero rank remains an additional limit even for an overleveled saved item.
	hero.stats = {"strength":5,"agility":1,"vitality":1,"intelligence":1}
	hero.gear.weapon = "axe@20"
	hero.gear.body = "plate@20"
	hero.gear.shield = "kite-shield@20"
	hero.gear.feet = "greaves@20"
	session.game = {"player":hero,"journey":{"expedition":2,"startLevel":100}}
	for encounter in [{"kind":"human","role":"Test"},{"kind":"creature","creatureId":species.id}]:
		var e = session.generate_enemy(5,encounter)
		check(data.level(e) == 90, "rank uses map-start level, equipment limits use actual hero")
		check(e.get("naturalWeaponLevel",1) <= 2, "natural weapon also capped at hero rank")
		for ref in e.gear.values():
			if ref: check(data.item(ref).level <= 2, "items capped at hero rank")
	# A species factor multiplies both damage resources, once, before rounding.
	var p = session.fighter("Target", {"strength":10,"agility":1,"vitality":1,"intelligence":1})
	var e = p.duplicate(true)
	e.creatureId = species.id
	var attack = {"id":"hit","category":"attack","shape":[[0,0]],"staminaCost":1,
		"healthDamage":{"base":12,"stats":[],"types":{"blunt":1}},"staminaDamagePerCell":2,"healing":3}
	p.deck = {"hand":[],"draw":[],"discard":[]}
	e.deck = {"hand":[attack],"draw":[],"discard":[]}
	e.hp = 20
	var moves = {"player":[],"enemy":[{"id":"hit","x":0,"y":0,"rotation":0}]}
	var mods = {"player":{},"enemy":{}}
	var g = {"player":p,"enemy":e}
	var calc = combat.calculate(g,moves,mods,true)
	check(is_equal_approx(calc.player.damage,4.2) and is_equal_approx(calc.player.staminaLoss,0.7), "12 and 2 times 0.7 times 0.5")
	check(calc.enemy.cost == 1 and calc.enemy.healed == 3, "species factor does not change costs or healing")
	check(is_equal_approx(calc.cells[0].playerDamage,4.2), "cell damage includes species factor")
	g.clashPlan = {"stage":"reaction","preparer":"enemy","playerPlaced":[],"enemyPlaced":moves.enemy,"playerModifiers":{},"enemyModifiers":{}}
	check(combat.forecast(g,[]).calculation == calc, "forecast and resolution agree with species coefficient")
	check(is_equal_approx(combat.damage_multiplier("enemy",e),0.35) and is_equal_approx(combat.damage_multiplier("player",e),0.5), "difficulty applies only to enemy; species factor follows creature")
	species.damageMultiplier = 0
	check(combat.calculate(g,moves,mods).player.damage == 0, "zero species coefficient is honored")
	species.erase("damageMultiplier")
	check(is_equal_approx(combat.calculate(g,moves,mods).player.damage,8.4), "omitted coefficient defaults to one")
	print("CREATURE_BALANCE: %d checks; %d failures" % [checks,failures.size()])
	quit(0 if failures.is_empty() else 1)
