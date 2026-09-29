extends SceneTree
const Catalog = preload("res://game/catalog.gd")
const Session = preload("res://tests/campaign_driver.gd")
var checks = 0
var failures: Array = []
func check(value: bool, message: String):
	checks += 1
	if not value:
		failures.append(message)
		printerr("FAIL: " + message)
func card(data, id): return data.lookup(data.skills, id).figure.duplicate(true)
func clash(combat, p, e, a, b = {}):
	p.deck = {"hand":[a], "draw":[], "discard":[], "exchanged":false}
	e.deck = {"hand":[b] if not b.is_empty() else [], "draw":[], "discard":[], "exchanged":false}
	return combat.calculate({"player":p,"enemy":e}, {"player":[{"id":a.id,"x":0,"y":0,"rotation":0}],"enemy":[{"id":b.id,"x":0,"y":0,"rotation":0}] if not b.is_empty() else []}, {"player":{},"enemy":{}}, true)
func _initialize():
	var data = Catalog.new()
	var session = Session.new(data)
	var combat = session.combat
	var stats = {"strength":1,"agility":1,"vitality":1,"intelligence":1}
	var p = session.fighter("Skills", stats)
	var e = session.fighter("Enemy", stats)
	check(data.skills.size() == 14, "All fourteen skills loaded")
	for definition in data.skills: check(data.image(definition.art) != null, "Skill image: " + definition.id)
	p.stats.strength = 5; p.stats.intelligence = 4
	check(combat.parts(p, card(data,"forceful-rebuff"))[0].value == 6, "Counter scales strength")
	var calculated = card(data,"calculated-strike")
	check(combat.stamina_damage_per_cell(p,calculated) == 5, "Intelligence stamina formula")
	var hit = clash(combat,p,e,calculated)
	check(hit.enemy.damage == 0 and hit.enemy.staminaLoss == 5, "Calculated strike hurts only stamina")
	check(clash(combat,p,e,card(data,"forceful-rebuff")).enemy.damage == 0, "Counter needs incoming attack")
	check(clash(combat,p,e,calculated,card(data,"parry")).enemy.staminaLoss == 0, "Evasion stops stamina attack")
	var attack = {"id":"test:area","name":"Area","shape":[],"category":"attack","staminaCost":0,"healthDamage":{"base":3,"stats":[],"types":{"magic":1}},"staminaDamagePerCell":1}
	for y in 3:
		for x in 3: attack.shape.append([x,y])
	var jump = clash(combat,p,e,card(data,"rebound"),attack)
	check(jump.player.damage == 15 and jump.player.staminaLoss == 5 and jump.player.cost == 0, "S evade protects four cells at no cost")
	var retreat = clash(combat,p,e,card(data,"step-back"),attack)
	check(retreat.player.damage == 0 and retreat.player.staminaLoss == 0, "Full board evade protects both resources")
	p.skills = ["step-back"]
	check(combat.build_deck(p).filter(func(m): return m.get("skillId", "") == "step-back").size() == 1, "Retreat has one base copy")
	p.skills = ["step-back","defense-training","rebound"]
	var deck = combat.build_deck(p)
	check(deck.filter(func(m): return m.get("skillId", "") == "step-back").size() == 2, "Defense training doubles retreat too")
	check(deck.filter(func(m): return m.get("skillId", "") == "rebound").size() == 2, "Other defenses still double")
	var ids = {}
	for m in deck: ids[m.id] = true
	check(ids.size() == deck.size(), "Every copy has a unique ID")
	p = session.fighter("Passive", stats)
	var rank = data.level(p)
	p.hp = 12; p.stamina = 3
	check(data.learn_skill(p,"robust-health").is_empty() and data.learn_skill(p,"tireless").is_empty(), "Learn passive skills")
	check(data.max_hp(p) == 70 and data.max_stamina(p) == 10 and data.effective_stat(p,"vitality") == 3, "Bonus maximums")
	check(p.stats == stats and data.level(p) == rank and p.hp == 12 and p.stamina == 3, "No base-level mutation or free healing")
	combat.start_deck(p);check(p.stamina == 10, "Battle fills enhanced stamina")
	p.stamina = 0
	var rest = combat.calculate({"player":p,"enemy":e},{"player":[],"enemy":[]},{"player":{},"enemy":{}})
	check(rest.player.staminaAfter == 10, "Skipping recovers enhanced maximum")
	p.hp = 65
	data.learn_skill(p,"bandage",0);data.learn_skill(p,"dodge",1)
	check(data.max_hp(p) == 30 and p.hp == 30 and data.max_stamina(p) == 8, "Replacing removes bonuses and clamps HP")
	p.skills = ["reaction"]
	check(data.learn_skill(p,"strategist").is_empty() and p.skills == ["strategist"], "Conflict replaces even with empty slots")
	p.skills = ["strategist","bandage","tireless"]
	var before = JSON.stringify(p)
	check(not data.learn_skill(p,"reaction",1).is_empty() and JSON.stringify(p) == before, "Wrong conflict slot rejected atomically")
	check(data.learn_skill(p,"reaction").is_empty() and p.skills == ["reaction","bandage","tireless"], "Full slots preserve unrelated skills")
	for mode in ["free"]:
		for id in ["reaction", "strategist"]:
			p = session.fighter("Player", stats);e = session.fighter("Enemy", stats)
			p.skills = [id]
			var g = {"phase":"combat","player":p,"enemy":e,"journey":{"battleMode":mode}}
			combat.begin(g)
			var first = "player" if id == "reaction" else "enemy"
			for round_number in range(1, 5):
				check(g.round == round_number and g.clashPlan.preparer == first, "Configured order every round: %s %s %d" % [id, mode, round_number])
				# JSON normalizes integer variants to floats; compare the loaded state before/after prepare.
				g = JSON.parse_string(JSON.stringify(g))
				var saved = g.duplicate(true)
				var rng_state = combat.rng.state
				combat.prepare(g)
				check(g.clashPlan == saved.clashPlan and g.player.deck == saved.player.deck and g.enemy.deck == saved.enemy.deck and combat.rng.state == rng_state, "Reload preserves plan, decks and RNG")
				g.clashPlan.enemyPlaced = []
				check(combat.submit(g, []).is_empty(), "Submit current round")
				if first == "player":
					check(g.clashPlan.stage == "reveal", "First player reveals before resolving")
					saved = g.clashPlan.duplicate(true);combat.prepare(g)
					check(g.clashPlan == saved, "Reopening preserves revealed plan")
					g.clashPlan.enemyPlaced = []
					check(combat.submit(g, []).is_empty(), "Resolve revealed round")
				check(g.phase == "combat" and g.round == round_number + 1, "Normal resolution advances the round")
	p.skills = [];e.skills = []
	for previous in ["player", "enemy"]:
		var g = {"player":p, "enemy":e, "lastReactor":previous}
		check(combat.turn_reactor(g) != previous, "No preferences alternate")
	p.skills = ["reaction"];e.skills = ["reaction"]
	for previous in ["player", "enemy"]:
		check(combat.turn_reactor({"player":p,"enemy":e,"lastReactor":previous}) != previous, "Equal preferences alternate")
	e.skills = ["strategist"]
	check(combat.turn_reactor({"player":p,"enemy":e,"lastReactor":"enemy"}) == "enemy", "Opposite preferences agree every round")
	p.skills = []
	check(combat.turn_reactor({"player":p,"enemy":e,"lastReactor":"enemy"}) == "enemy", "Enemy preference applies every round")
	# A made-up ID proves behavior is interpreted from data, not built-in skill names.
	data.skills.append({"id":"test-passive","passive":{"statBonuses":{"intelligence":3},"maxStaminaBonus":5,"turnOrder":"second"}})
	p.skills = ["test-passive"]
	check(data.max_stamina(p) == 13 and data.effective_stat(p,"intelligence") == 4 and data.turn_order(p) == "second", "Passive interpreter accepts arbitrary configured IDs")
	e.skills = []
	check(combat.turn_reactor({"player":p,"enemy":e,"lastReactor":"player"}) == "player", "Arbitrary configured passive controls later rounds")
	data.skills.pop_back()
	session.create("Save", {"strength":2,"agility":2,"vitality":1,"intelligence":2}, data.portraits[0].id)
	session.game.player.skills = ["robust-health","tireless"]
	session.game.player.hp = data.max_hp(session.game.player);session.game.player.stamina = 10
	var payload = {"format":1,"game":session.game.duplicate(true),"draft":[],"rngState":str(combat.rng.state)}
	for i in 3:
		var restored = Session.new(data)
		check(restored.restore(payload).is_empty(), "New skill save restores")
		check(restored.game.player.stats.vitality == 1 and data.max_hp(restored.game.player) == 70 and restored.game.player.stamina == 10, "Restore does not stack or clamp bonuses")
		payload.game = restored.game.duplicate(true)
	print("SKILLS: %s (%d checks; %d failures)" % ["PASS" if failures.is_empty() else "FAIL", checks, failures.size()])
	quit(0 if failures.is_empty() else 1)
