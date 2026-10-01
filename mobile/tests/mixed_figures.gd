extends SceneTree
const Catalog = preload("res://game/catalog.gd")
const Combat = preload("res://game/combat.gd")
const Actions = preload("res://game/figure_actions.gd")
var data = Catalog.new()
var combat = Combat.new(data)
var checks = 0
var failures: Array = []
func check(ok: bool, text: String):
	checks += 1
	if not ok: failures.append(text); printerr("FAIL: "+text)
func move(id: String,n: int = 0,r: int = 0) -> Dictionary:
	return {"id":id,"x":n%3,"y":int(n/3),"rotation":r}
func hit(damage: int = 8, sp: int = 0) -> Dictionary:
	return {"category":"attack","name":"Укол","healthDamage":{"base":damage,"stats":[],"types":{"blunt":1}},"staminaDamagePerCell":sp}
func guard() -> Dictionary:
	return {"category":"defense","name":"Блок","blocks":true,"blockCost":1,"art":"/actions/spear-guard.png"}
func mixed() -> Dictionary:
	return {"id":"mixed","name":"Выпад","category":"attack","copies":1,"shape":[[0,0],[1,0],[2,0]],"staminaCost":1,"sourceKind":"weapon","cellActions":[guard(),guard(),hit(8,2)],"art":"/weapons/spear.png"}
func fighter(cards: Array) -> Dictionary:
	return {"name":"Test","stats":{"strength":1,"agility":1,"vitality":1,"intelligence":1},"hp":30.0,"stamina":8.0,"skills":[],"gear":{},"deck":{"hand":cards,"draw":[],"discard":[],"exchanged":false}}
func calc(p: Dictionary,e: Dictionary,a: Array,b: Array = [],mod: Dictionary = {}) -> Dictionary:
	return combat.calculate({"player":p,"enemy":e},{"player":a,"enemy":b},{"player":mod,"enemy":{}},true)
func _initialize():
	combat.enemy_damage_multiplier = 1
	var card = mixed()
	var enemy_hit = hit(6,2)
	enemy_hit.merge({"id":"enemy","name":"Вражеский удар","shape":[[0,0],[1,0],[2,0]],"staminaCost":0})
	var p = fighter([card])
	var e = fighter([enemy_hit])
	var expected = [[0,1,2],[0,3,6],[2,1,0],[6,3,0]]
	for rotation in 4:
		var points = combat.cells(card,move(card.id,0,rotation))
		check(points == expected[rotation],"rotation keeps original cell indices %d" % rotation)
		var layer = combat.layer(p,[move(card.id,0,rotation)])
		for i in 3:
			check(layer[points[i]].get("blocks",false) == (i < 2),"guard follows rotation")
			check(combat.is_strike(layer[points[i]]) == (i == 2),"attack follows rotation")
	var before = JSON.stringify(p)
	var result = calc(p,e,[move(card.id)],[move(enemy_hit.id)])
	check(result.player.damage == 3 and result.enemy.damage == 4,"two blocks prevent damage; only attack cell clashes")
	check(result.player.staminaLoss == 1 and result.enemy.staminaLoss == 1,"stamina damage follows cell effects")
	check(result.player.cost == 3 and result.player.attackCost == 1 and result.player.blockCost == 2,"figure cost paid once, two contacted blocks")
	check(result.cells[0].enemyDamage == 0 and result.cells[1].enemyDamage == 0 and result.cells[2].enemyDamage == 4,"damage breakdown attributes only attacking cell")
	check(JSON.stringify(p) == before,"mixed calculation does not mutate cards")
	check(combat.cost(p,[move(card.id)]).total == 3,"blind reserve includes both blocks")
	result = calc(p,e,[move(card.id)])
	check(result.player.cost == 1 and result.enemy.damage == 8,"empty cells charge no block and one attack deals full damage")
	p.stamina = 2
	check(not combat.validate(p,[move(card.id)]).is_empty(),"unaffordable blind placement rejected")
	check(combat.validate(p,[move(card.id)],{},[{},{},{},{},{},{},{},{},{}]).is_empty(),"known empty opposition needs only base cost")
	p.stamina = 8
	result = calc(p,e,[move(card.id)],[],{"compressed":card.id})
	check(result.enemy.damage == 8 and result.enemy.staminaLoss == 2,"compression counts only attacking cells")
	check(result.cells[0].player.get("blocks",false) and result.cells[1].player.is_empty(),"compression retains defense in a single cell")
	check(combat.cost(p,[move(card.id)],{"compressed":card.id}).total == 2,"compressed block reserved once")
	enemy_hit.shape = [[0,0]]
	result = calc(p,e,[move(card.id)],[move(enemy_hit.id)],{"compressed":card.id})
	check(result.player.damage == 0 and result.enemy.damage == 4 and result.player.cost == 2,"compressed guard protects while attack resolves normally")
	card.cellActions[0] = hit(4)
	card.cellActions[0].healthDamage.types = {"fire":1}
	result = calc(p,e,[move(card.id)],[],{"compressed":card.id})
	check(result.enemy.damage == 12 and result.cells[0].playerAttack.parts.size() == 2,"different compressed damage profiles remain distinct")
	card.cellActions[0] = {"category":"defense","name":"Уклонение","evades":true}
	result = calc(p,e,[move(card.id)],[move(enemy_hit.id)])
	check(result.player.damage == 0 and result.enemy.damage == 8 and result.player.cost == 1,"evade cell has no attack or block cost")
	# A neighboring shield must touch the attack cell, not the guard portion.
	card = mixed(); p = fighter([card])
	var shield = guard(); shield.merge({"id":"shield","shape":[[0,0]],"sourceKind":"shield","staminaCost":0})
	p.deck.hand.append(shield)
	check(combat.combos.build(p,[move(card.id),move(shield.id,3)]).combos.is_empty(),"guard part of weapon cannot count as adjacent attack")
	check(not combat.combos.build(p,[move(card.id),move(shield.id,5)]).combos.is_empty(),"attack part can connect to a separate shield")
	check(combat.combos.build(p,[move(card.id)]).combos.is_empty(),"mixed card never combos with itself")
	# Same outline, different action order: only the 180-degree placement wins this puzzle.
	var target = {"id":"target","name":"Цель","category":"defense","shape":[],"cellActions":[],"staminaCost":0}
	for n in 9:
		target.shape.append([n%3,int(n/3)])
		target.cellActions.append(hit(6) if n < 2 else {"category":"defense","blocks":true})
	var foe = mixed(); foe.cellActions[2].staminaDamagePerCell = 0
	var g = {"player":fighter([target]),"enemy":fighter([foe]),"clashPlan":{"preparer":"player","stage":"reveal","playerPlaced":[move(target.id)],"enemyPlaced":[],"playerModifiers":{},"enemyModifiers":{}}}
	var plan = combat.plan_ai(g)
	check(plan.size() == 1 and plan[0].x == 0 and plan[0].y == 0 and plan[0].rotation == 2,"AI retains mirrored action arrangements with identical outline")
	g.clashPlan.stage = "reaction";g.clashPlan.preparer = "enemy";g.clashPlan.enemyPlaced = plan
	var forecast = combat.forecast(g,[move(target.id)])
	var actual = combat.calculate(g,{"player":[move(target.id)],"enemy":plan},{"player":{},"enemy":{}},true)
	check(forecast.calculation == actual,"mixed forecast equals resolution")
	var saved = JSON.parse_string(JSON.stringify(g))
	check(JSON.parse_string(JSON.stringify(combat.calculate(saved,{"player":[move(target.id)],"enemy":plan},{"player":{},"enemy":{}},true))) == JSON.parse_string(JSON.stringify(actual)),"serialized mixed cards preserve effects and rotation")
	# Canonical content and fixed level scaling.
	for id in ["spear","soldier-spear","tailwind-spear"]:
		var item = data.item(id+"@5")
		check(item.level == 5,"mixed-only damage profile preserves item level")
		var owner = fighter([]);owner.gear.weapon = item.id
		owner.stats = {"strength":5,"agility":5,"vitality":1,"intelligence":5}
		var figure = combat.figures(owner).filter(func(c):return Actions.mixed(c))[0]
		check(figure.cellActions.size() == figure.shape.size(),"canonical profile count matches shape")
		check(Actions.profiles(figure).filter(func(c):return c.get("blocks",false)).size() == 2,"canonical spear has two guards")
		var tip = Actions.action(figure,2)
		check(tip.sourceLevel == 5 and tip.sourceTier == item.tier and not combat.parts(owner,tip).is_empty(),"tip inherits item level and tier")
		check(data.image(Actions.action(figure,0).art) != null,"new guard illustration synchronized")
		owner.skills = ["attack-training","defense-training"]
		var copies = combat.build_deck(owner).filter(func(c):return Actions.mixed(c)).size()
		check(copies == figure.copies*2,"deck multiplier uses figure category once")
	print("MIXED_FIGURES: %d checks; %d failures" % [checks,failures.size()])
	quit(0 if failures.is_empty() else 1)
