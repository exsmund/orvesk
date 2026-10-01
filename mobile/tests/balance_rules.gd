extends SceneTree
## Hand-calculated default-balance examples, independent of reference parameters.
const Catalog = preload("res://game/catalog.gd")
const Session = preload("res://tests/campaign_driver.gd")
var checks = 0
var failures: Array = []

func check(ok: bool, label: String):
	checks += 1
	if not ok:
		failures.append(label)
		printerr("FAIL: " + label)

func attack(id: String) -> Dictionary:
	return {"id":id,"shape":[[0,0]],"category":"attack","staminaCost":1,
		"healthDamage":{"base":12,"stats":[],"types":{"blunt":1}},"staminaDamagePerCell":2}

func move(id: String, x: int) -> Dictionary:
	return {"id":id,"x":x,"y":0,"rotation":0}

func _initialize():
	var data = Catalog.new()
	var session = Session.new(data)
	var combat = session.combat
	check(data.balance.health.base == 30 and data.balance.health.perVitality == 15 and data.balance.health.perLevel == 5, "current HP coefficients")
	check(data.balance.armorK == 10 and data.balance.armorMaxReduction == 0.5, "current armor coefficients")
	check(combat.enemy_damage_multiplier == 0.7 and not data.balance.has("enemyDamageMultiplier"), "difficulty default is independent of shared balance")
	for example in [
		{"stats":{"strength":1,"agility":1,"vitality":1,"intelligence":1},"level":0,"hp":30},
		{"stats":{"strength":4,"agility":1,"vitality":1,"intelligence":1},"level":1,"hp":30},
		{"stats":{"strength":5,"agility":1,"vitality":1,"intelligence":1},"level":2,"hp":35},
		{"stats":{"strength":3,"agility":2,"vitality":4,"intelligence":2},"level":5,"hp":95},
		{"stats":{"strength":103,"agility":1,"vitality":1,"intelligence":1},"level":100,"hp":525},
		{"stats":{"strength":1,"agility":1,"vitality":103,"intelligence":1},"level":100,"hp":2055}]:
		var f = session.fighter("HP", example.stats)
		check(data.level(f) == example.level and data.max_hp(f) == example.hp, "HP from level and vitality: " + str(example.level))
		f.skills = ["robust-health"]
		check(data.level(f) == example.level and data.max_hp(f) == example.hp + 30, "passive HP does not increase base level")
	for example in [[-5,1.0],[0,1.0],[2,11.0/12.0],[5,5.0/6.0],[10,0.75],[100,6.0/11.0]]:
		check(is_equal_approx(data.armor_damage_factor(example[0]), example[1]), "armor factor " + str(example[0]))
	check(data.armor_damage_factor(1000000) > 0.5 and data.armor_damage_factor(1000000) < 0.50001, "protection tends to 50%, not 100%")
	var p = session.fighter("Player", {"strength":6,"agility":1,"vitality":1,"intelligence":1})
	var e = p.duplicate(true)
	for f in [p,e]:
		f.skills = []
		for slot in f.gear: f.gear[slot] = null
		f.deck = {"hand":[attack("hit")],"draw":[],"discard":[],"exchanged":false}
	var moves = {"player":[move("hit",0)],"enemy":[move("hit",1)]}
	var mods = {"player":{},"enemy":{}}
	var fighters = {"player":p,"enemy":e}
	var result = combat.calculate(fighters,moves,mods,true)
	check(is_equal_approx(result.player.damage,8.4) and result.enemy.damage == 12, "only enemy HP attack is multiplied")
	check(is_equal_approx(result.player.staminaLoss,1.4) and result.enemy.staminaLoss == 2, "only enemy stamina attack is multiplied")
	check(result.player.cost == 1 and result.enemy.cost == 1, "multiplier does not reduce action costs")
	check(combat.parts(p,p.deck.hand[0]) == combat.parts(e,e.deck.hand[0]), "raw weapon profiles are still identical")
	var g = fighters.duplicate(true)
	g.clashPlan = {"stage":"reaction","preparer":"enemy","playerPlaced":[],"enemyPlaced":moves.enemy,"playerModifiers":{},"enemyModifiers":{}}
	check(combat.forecast(g,moves.player).calculation == result, "forecast uses the exact final damage calculation")
	moves.enemy[0].x = 0
	result = combat.calculate(fighters,moves,mods,true)
	check(is_equal_approx(result.player.damage,4.2) and result.enemy.damage == 6, "collision halves scaled attacks")
	check(is_equal_approx(result.player.staminaLoss,0.7) and result.enemy.staminaLoss == 1, "collision also halves stamina damage")
	e.deck.hand[0].category = "block"
	e.deck.hand[0].counter = true
	e.deck.hand[0].blocks = true
	e.deck.hand[0].blockCost = 1
	result = combat.calculate(fighters,moves,mods,true)
	check(is_equal_approx(result.player.damage,8.4) and result.enemy.damage == 0 and result.enemy.blockCost == 1, "enemy counter scaled once; blocking unchanged")
	e.deck.hand[0] = attack("hit")
	e.deck.hand[0].shape = [[0,0],[1,0]]
	moves.enemy[0].x = 1
	mods.enemy.compressed = "hit"
	result = combat.calculate(fighters,moves,mods,true)
	check(is_equal_approx(result.player.damage,16.8) and is_equal_approx(result.player.staminaLoss,2.8), "compression preserves scaled total damage")
	check(is_equal_approx(result.cells[1].playerDamage,16.8), "cell detail agrees with total after compression")
	e.deck.hand[0] = attack("hit")
	mods.enemy = {}
	data.items.append({"id":"test-armor","kind":"armor","slot":"body","level":1,"tier":1,"defense":{"blunt":10},"requirements":{},"figures":[]})
	p.gear.body = "test-armor"
	result = combat.calculate(fighters,moves,mods,true)
	check(is_equal_approx(result.player.damage,6.3) and is_equal_approx(result.player.staminaLoss,1.4), "armor affects health only; enemy factor applied once")
	p.gear.body = null
	p.deck.hand[0].healthDamage.base = 0
	e.hp = 20
	e.deck.hand[0].healing = 3
	result = combat.calculate(fighters,moves,mods,true)
	check(result.enemy.healed == 3 and result.enemy.hpAfter == 23, "enemy healing is not multiplied")
	p.hp = 2
	result = combat.calculate(fighters,moves,mods,true)
	check(result.player.damage == 2 and result.cells[1].playerDamage == 2, "lethal damage capped after scaling")
	p.hp = data.max_hp(p)
	e.deck.hand[0].healthDamage.base = 3
	e.deck.hand[0].shape = [[0,0],[1,0],[0,1]]
	moves.enemy[0].x = 0
	moves.player = []
	result = combat.calculate(fighters,moves,mods,true)
	var total = 0.0
	for cell in result.cells: total += cell.playerDamage
	check(is_equal_approx(total,6.3) and is_equal_approx(result.player.damage,6.3), "rounding reconciles multi-cell losses")
	check(result.player.staminaAfter == 8, "rest still fully restores stamina")
	combat.enemy_damage_multiplier = 1.0
	check(combat.calculate(fighters,moves,mods).player.damage == 9, "global multiplier is configurable")
	combat.enemy_damage_multiplier = 0.7
	check(session.create("Restore", {"strength":1,"agility":1,"vitality":4,"intelligence":1},data.portraits[0].id).is_empty(), "create restore fixture")
	session.game.player.hp = 90
	var payload = {"format":1,"game":session.game.duplicate(true),"draft":[],"rngState":str(combat.rng.state)}
	var restored = Session.new(data)
	check(restored.restore(payload).is_empty() and restored.game.player.hp == 75, "saved HP is clamped to new maximum")
	check(restored.combat.rng.state == combat.rng.state, "clamping does not change RNG")
	print("BALANCE_RULES: %d checks; %d failures" % [checks,failures.size()])
	quit(0 if failures.is_empty() else 1)
