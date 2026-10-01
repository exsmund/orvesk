extends SceneTree
const Catalog = preload("res://game/catalog.gd")
const Combat = preload("res://game/combat.gd")
var checks = 0
var failures: Array = []
var data
var combat
func check(ok: bool, message: String):
	checks += 1
	if not ok: failures.append(message); printerr("FAIL: "+message)
func card(id: String, role: String, shape: Array = [[0,0]], damage: float = 8) -> Dictionary:
	var c = {"id":id,"name":id,"shape":shape,"category":"attack","staminaCost":1,"sourceKind":"weapon","healthDamage":{"base":damage,"stats":[],"types":{"blunt":1}}}
	if role == "guard":
		c.sourceKind = "shield"
		c.category = "defense"
		c.blocks = true
		c.blockCost = 1
		c.staminaCost = 0
		c.erase("healthDamage")
	if role == "kick": c.sourceKind = "armor"; c.sourceSlot = "feet"
	if role == "skill": c.skillId = "test"
	if role == "intrinsic": c.erase("sourceKind")
	return c
func fighter(cards: Array) -> Dictionary:
	return {"name":"Test","stats":{"strength":1,"agility":1,"vitality":1,"intelligence":1},"hp":30.0,"stamina":8.0,"gear":{},"skills":[],"deck":{"hand":cards,"draw":[],"discard":[]}}
func move(id: String,n: int,rotation: int = 0) -> Dictionary:
	return {"id":id,"x":n%3,"y":int(n/3),"rotation":rotation}
func calc(p: Dictionary,e: Dictionary,a: Array,b: Array = [],mod: Dictionary = {}) -> Dictionary:
	return combat.calculate({"player":p,"enemy":e},{"player":a,"enemy":b},{"player":mod,"enemy":{}},true)
func has_combo(result: Dictionary,id: String) -> bool:
	for cell in result.cells:
		for combo in cell.playerCombos:
			if combo.id == id and combo.active: return true
	return false
func _initialize():
	data = Catalog.new()
	combat = Combat.new(data)
	combat.enemy_damage_multiplier = 1
	var p = fighter([card("w","weapon"),card("s","guard")])
	var e = fighter([card("e","intrinsic")])
	var result = calc(p,e,[move("w",0),move("s",3)],[move("e",3)])
	check(result.enemy.damage == 10 and result.player.damage == 0,"Covered strike adds 25 percent and block stops attack")
	check(result.player.cost == 2 and has_combo(result,"covered-strike"),"Covered strike expense and metadata")
	check(calc(p,e,[move("w",0),move("s",4)],[move("e",4)]).enemy.damage == 8,"Diagonal does not connect")
	check(calc(p,e,[move("w",0),move("s",3)]).enemy.damage == 8,"No incoming attack means no conditional bonus")
	for excluded in ["skill","intrinsic"]:
		p.deck.hand[0] = card("w",excluded)
		check(not has_combo(calc(p,e,[move("w",0),move("s",3)],[move("e",3)]),"covered-strike"),"Exclude "+excluded)
	p = fighter([card("a","weapon",[[0,0],[1,0]]),card("b","weapon",[[0,0],[1,0]])])
	data.items.append({"id":"test-armor","templateId":"test-armor","kind":"armor","slot":"body","requirements":{},"defense":{"blunt":10},"figures":[]})
	e.gear.body = "test-armor"
	result = calc(p,e,[move("a",0),move("b",3)])
	check(has_combo(result,"breach") and is_equal_approx(result.enemy.damage,25.1),"Breach: 4 * 8 * (1 - .5 * 7.5 / 17.5) rounds to 25.1")
	check(not has_combo(calc(p,e,[move("a",0),move("b",4)]),"breach"),"One edge cannot trigger breach")
	e.gear = {}
	p = fighter([card("a","guard",[[0,0],[1,0]]),card("b","guard",[[0,0],[1,0]])])
	e = fighter([card("e","intrinsic",[[0,0],[1,0],[0,1],[1,1]])])
	result = calc(p,e,[move("a",0),move("b",3)],[move("e",0)])
	check(result.player.blockCost == 3 and result.player.damage == 0,"Solid defense discount is once, not per edge")
	check(combat.cost(p,[move("a",0),move("b",3)]).blocks == 3,"Blind reserve includes discount")
	p = fighter([card("k","kick"),card("w","weapon")])
	e = fighter([])
	result = calc(p,e,[move("k",0),move("w",1)])
	check(result.enemy.staminaLoss == 2 and has_combo(result,"trip"),"Trip loses two stamina once")
	e.deck.hand = [card("s","guard")]
	check(calc(p,e,[move("k",0),move("w",1)],[move("s",1)]).enemy.staminaLoss == 0,"Trip needs both attacks to hit")
	p = fighter([card("k","kick"),card("s","guard")])
	e = fighter([card("e","intrinsic")])
	result = calc(p,e,[move("k",0),move("s",1)],[move("e",1)])
	check(result.player.comboRefund == 1 and result.player.staminaAfter == 7,"Stance refunds only after paying")
	p.stamina = 1
	check(combat.validate(p,[move("k",0),move("s",1)],{},combat.layer(e,[move("e",1)])) != "","Refund cannot finance placement")
	p = fighter([card("a","guard",[[0,0],[1,0]]),card("b","guard",[[0,0],[0,1]])])
	e = fighter([card("e","intrinsic")])
	result = calc(p,e,[move("a",0),move("b",3)],[move("e",4)])
	check(result.cells[4].player.get("comboBonus",false) and result.player.damage == 0 and result.player.cost == 1,"Corner makes paid block in concave empty cell")
	check(combat.cost(p,[move("a",0),move("b",3)]).blocks == 5,"Unknown enemy reserves bonus block")
	p = fighter([card("a","weapon",[[0,0]],3),card("b","kick",[[0,0]],5),card("c","weapon",[[0,0]],7)])
	e = fighter([])
	result = calc(p,e,[move("a",1),move("b",3),move("c",5)])
	check(result.cells[4].player.get("comboBonus",false) and result.enemy.damage == 18,"Surround adds weakest 3 damage only once")
	check(result.player.attackCost == 3,"Bonus attack adds no card cost")
	e.deck.hand = [card("s","guard")]
	check(calc(p,e,[move("a",1),move("b",3),move("c",5)],[move("s",4)]).enemy.damage == 15,"Bonus attack obeys block")
	# Existing saved cards resolve their equipment without modifying the save.
	var equipment = data.lookup(data.items,"iron-boots")
	var old = equipment.figures[0].duplicate(true)
	old.id = "iron-boots:kick#1"
	p.gear = {"feet":"iron-boots"}
	check(combat.combos.role(p,old) == "footAttack","Legacy equipment card recognized")
	var g = {"player":p,"enemy":e,"clashPlan":{"stage":"preparation","preparer":"player","playerPlaced":[],"enemyPlaced":[move("s",4)],"playerModifiers":{},"enemyModifiers":{}}}
	var draft = [move("a",1),move("b",3),move("c",5)]
	var before = JSON.stringify(g)
	var state = combat.rng.state
	var forecast = combat.forecast(g,draft)
	check(forecast.cells[4].player.get("comboBonus",false),"Forecast includes extra cell")
	check(JSON.stringify(g) == before and state == combat.rng.state,"Forecast is pure")
	g.clashPlan.enemyPlaced = []
	check(combat.forecast(g,draft) == forecast,"Hidden enemy placement cannot leak")
	g.clashPlan.stage = "reaction"
	g.clashPlan.preparer = "enemy"
	check(combat.forecast(g,draft).calculation == calc(p,e,draft),"Forecast and resolution identical")
	# AI must find two adjacent equipment figures and avoid an exposed lethal hit.
	g.player = fighter([card("hit","intrinsic")])
	g.enemy = fighter([card("kick","kick"),card("weapon","weapon")])
	g.clashPlan.preparer = "player"
	g.clashPlan.playerPlaced = []
	var start = Time.get_ticks_msec()
	var ai = combat.plan_ai(g)
	check(combat.validate(g.enemy,ai,{},combat.layer(g.player,[])) == "","AI plan legal")
	check(combat.combos.build(g.enemy,ai).combos.any(func(c): return c.id == "trip"),"AI deliberately builds equipment combo")
	print("AI two-card planning ms: ",Time.get_ticks_msec()-start)
	# Enemy receives identical mechanics but no visual player metadata.
	result = combat.calculate(g,{"player":[],"enemy":ai},{"player":{},"enemy":{}},true)
	check(result.player.staminaLoss == 2 and result.cells.all(func(c): return c.playerCombos.is_empty()),"Enemy combo acts without player effects")
	# Degenerate profiles and repeated adjacency must not mint extra bonuses.
	p = fighter([card("k","kick",[[0,0]],0),card("w","weapon")])
	e = fighter([])
	check(calc(p,e,[move("k",0),move("w",1)]).enemy.staminaLoss == 0,"Zero HP profile is not a successful trip")
	p = fighter([card("a","weapon",[[0,0],[1,0]]),card("b","weapon",[[0,0],[1,0]])])
	check(not has_combo(calc(p,e,[move("a",0)]),"breach"),"One figure cannot combo with itself")
	check(not has_combo(calc(p,e,[move("a",0),move("b",3)],[],{"compressed":"a"}),"breach"),"Compression changes adjacency requirements")
	p = fighter([card("k","kick",[[0,0],[1,0]]),card("w","weapon",[[0,0],[1,0]])])
	check(calc(p,e,[move("k",0),move("w",3)]).enemy.staminaLoss == 2,"Multiple contacts still apply trip once")
	p = fighter([card("a","weapon",[[0,0]],2),card("b","weapon",[[0,0]],4),card("c","weapon",[[0,0]],6),card("d","weapon",[[0,0]],8)])
	result = calc(p,e,[move("a",1),move("b",3),move("c",5),move("d",7)])
	check(result.enemy.damage == 22 and result.cells.filter(func(c): return c.player.get("comboBonus",false)).size() == 1,"Four neighbors generate one bonus, without recursion")
	# Refund is suppressed on death; lethal simultaneous outgoing damage remains.
	p = fighter([card("k","kick"),card("s","guard")])
	p.hp = 1
	e = fighter([card("hit","intrinsic",[[0,0],[0,1]],8)])
	result = calc(p,e,[move("k",0),move("s",1)],[move("hit",1)])
	check(result.player.hpAfter == 0 and result.player.comboRefund == 0 and result.enemy.damage == 8,"Death prevents refund but not simultaneous kick")
	# All difficulty multipliers apply once to the extra SP effect.
	combat.enemy_damage_multiplier = 0.6
	p = fighter([])
	e = fighter([card("k","kick"),card("w","weapon")])
	result = calc(p,e,[],[move("k",0),move("w",1)])
	check(is_equal_approx(result.player.staminaLoss,1.2),"Enemy trip respects difficulty")
	combat.enemy_damage_multiplier = 1
	# A full real equipment hand checks runtime budget and sourceSlot classification.
	g.enemy = fighter([])
	g.enemy.gear = {"weapon":"dagger","shield":"buckler","feet":"iron-boots"}
	var deck = combat.build_deck(g.enemy)
	g.enemy.deck.hand = [deck.filter(func(c): return c.get("sourceKind","") == "weapon")[0],deck.filter(func(c): return c.get("sourceKind","") == "weapon")[1],deck.filter(func(c): return c.get("blocks",false))[0],deck.filter(func(c): return c.get("sourceSlot","") == "feet")[0]]
	g.player = fighter([card("hit","intrinsic",[[0,0],[1,0]],10)])
	g.clashPlan.playerPlaced = [move("hit",0)]
	start = Time.get_ticks_msec()
	ai = combat.plan_ai(g)
	check(combat.validate(g.enemy,ai,{},combat.layer(g.player,g.clashPlan.playerPlaced)) == "","Full-hand AI obeys placement and reserve")
	print("AI four-card planning ms: ",Time.get_ticks_msec()-start)
	g.clashPlan.preparer = "enemy"
	var rng_before = combat.rng.state
	var blind_plan = combat.plan_ai(g)
	g.clashPlan.playerPlaced = [move("hit",6)]
	g.clashPlan.playerModifiers = {"compressed":"hit"}
	g.player.deck.hand = [card("secret","skill",[[0,0]],999)]
	check(combat.plan_ai(g) == blind_plan and combat.rng.state == rng_before,"First-playing AI never uses hidden placement, modifiers or hand")
	print("COMBOS: ",checks," checks; ",failures.size()," failures")
	quit(0 if failures.is_empty() else 1)
