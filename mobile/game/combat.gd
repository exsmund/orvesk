extends RefCounted
## Pure rules: no nodes, rendering, filesystem or HTTP.
const Actions = preload("res://game/figure_actions.gd")
var catalog
var combos
# Session loads this from the hero save, independently of shared balance data.
var enemy_damage_multiplier: float
var rng = RandomNumberGenerator.new()

func _init(data):
	catalog = data
	combos = preload("res://game/combos.gd").new(self)
	enemy_damage_multiplier = float(data.difficulty().enemyDamageMultiplier)
	rng.randomize()

func shuffled(values: Array) -> Array:
	var result = values.duplicate(true)
	for i in range(result.size() - 1, 0, -1):
		var j = rng.randi_range(0, i)
		var old = result[i]
		result[i] = result[j]
		result[j] = old
	return result

func figures(f: Dictionary) -> Array:
	var result: Array = []
	var intrinsic = catalog.creature_figures(f) if f.get("creatureId", "") else catalog.base
	for definition in intrinsic:
		var availability = definition.get("availability", "")
		if availability == "emptyWeapon" and catalog.has_equipment(f, "weapon"): continue
		if availability == "emptyFeet" and catalog.has_equipment(f, "feet"): continue
		if availability == "emptyShield" and (catalog.has_equipment(f, "shield") or catalog.item(f.gear.weapon).get("hands", 1) == 2): continue
		var card = definition.duplicate(true)
		card.id = "base:" + definition.id
		card.sourceLevel = 1
		card.sourceTier = 0
		if card.get("naturalLevel", false):
			card.sourceTier = int(f.get("naturalWeaponTier", 0))
			var stats: Array = []
			for profile in Actions.profiles(card):
				for stat in profile.get("healthDamage", {}).get("stats", []):
					if stat not in stats: stats.append(stat)
			if not stats.is_empty():
				card.sourceLevel = clampi(int(f.get("naturalWeaponLevel", 1)), 1, 999)
				for stat in stats: card.sourceLevel = mini(card.sourceLevel, catalog.effective_stat(f, stat))
		result.append(card)
	for slot in catalog.SLOTS:
		if not f.gear.get(slot): continue
		var equipment = catalog.item(f.gear[slot])
		# Basic items expose the same intrinsic figures, with stable IDs for dealt saves.
		if equipment.get("charmEffect", "") or equipment.get("unarmed", false): continue
		for definition in equipment.figures:
			var card = definition.duplicate(true)
			card.id = equipment.id + ":" + definition.id
			card.sourceKind = equipment.kind
			card.sourceSlot = slot
			card.sourceLevel = equipment.level
			card.sourceTier = int(equipment.tier) if equipment.kind == "weapon" else 0
			card.art = card.get("art", catalog.art.get(equipment.templateId, ""))
			result.append(card)
	for skill in catalog.skills:
		if skill.id in f.get("skills", []) and skill.has("figure"):
			var card = skill.figure.duplicate(true)
			card.skillId = skill.id
			result.append(card)
	return result

func build_deck(f: Dictionary) -> Array:
	var result: Array = []
	for card in figures(f):
		var copies = int(card.get("copies", 1))
		for skill in catalog.skills:
			if skill.id in f.get("skills", []) and skill.has("deckMultiplier") and skill.deckMultiplier.category == card.get("category", ""):
				copies *= int(skill.deckMultiplier.factor)
		for i in copies:
			var copy = card.duplicate(true)
			copy.templateId = card.id
			copy.id = "%s#%d" % [card.id, i + 1]
			result.append(copy)
	return result

func refresh_skill_healing(f: Dictionary):
	# Preserve dealt IDs, placement, pile order and RNG when loading updated skills.
	for pile in ["hand", "draw", "discard"]:
		for card in f.get("deck", {}).get(pile, []):
			var definition = catalog.lookup(catalog.skills, card.get("skillId", "")).get("figure", {})
			if not definition.has("healingMaxHealthPercent"): continue
			card.erase("healing")
			if definition.has("healing"): card.healing = definition.healing
			card.healingMaxHealthPercent = definition.healingMaxHealthPercent
			card.description = definition.get("description", "")

func fill_hand(f: Dictionary):
	var deck = f.deck
	while deck.hand.size() < catalog.balance.handSize:
		if deck.draw.is_empty():
			if deck.discard.is_empty(): break
			deck.draw = shuffled(deck.discard)
			deck.discard = []
		deck.hand.append(deck.draw.pop_front())

func start_deck(f: Dictionary):
	f.deck = {"draw": shuffled(build_deck(f)), "hand": [], "discard": [], "exchanged": false}
	f.stamina = catalog.max_stamina(f)
	f.exhausted = false
	f.charmsUsed = {"ring": false, "amulet": false}
	fill_hand(f)

func spend(f: Dictionary, placed: Array):
	var ids = placed.map(func(p): return p.id)
	var kept: Array = []
	for card in f.deck.hand:
		if card.id in ids: f.deck.discard.append(card)
		else: kept.append(card)
	f.deck.hand = kept
	f.deck.exchanged = false
	fill_hand(f)

func cells(card: Dictionary, p: Dictionary, mod: Dictionary = {}) -> Array:
	var shape = [[0, 0]] if mod.get("compressed", "") == p.id else card.shape
	var points: Array[Vector2i] = []
	for pair in shape:
		var point = Vector2i(pair[0], pair[1])
		for _r in int(p.rotation): point = Vector2i(-point.y, point.x)
		points.append(point)
	var min_x = 999
	var min_y = 999
	for point in points:
		min_x = mini(min_x, point.x)
		min_y = mini(min_y, point.y)
	var result: Array = []
	for point in points:
		var x = point.x - min_x + int(p.x)
		var y = point.y - min_y + int(p.y)
		result.append(y * 3 + x if x >= 0 and x < 3 and y >= 0 and y < 3 else -1)
	return result

func card_by_id(f: Dictionary, id: String) -> Dictionary:
	return catalog.lookup(f.deck.hand, id)

func layer(f: Dictionary, placed: Array, mod: Dictionary = {}) -> Array:
	var result: Array = [{}, {}, {}, {}, {}, {}, {}, {}, {}]
	for p in placed:
		var card = card_by_id(f, p.id)
		if card.is_empty(): continue
		var indices = cells(card, p, mod)
		for i in indices.size():
			if indices[i] >= 0: result[indices[i]] = placed_action(card,i,mod)
	return result

func placed_action(card: Dictionary, index: int, mod: Dictionary = {}) -> Dictionary:
	return Actions.compressed(card) if mod.get("compressed", "") == card.id else Actions.action(card,index)

func concentration(card: Dictionary, mod: Dictionary) -> float:
	if card.has("cellComponents") or card.has("cellIndex"): return float(card.get("comboConcentration",1))
	return float(card.shape.size()) if not card.get("comboBonus",false) and mod.get("compressed", "") == card.id else float(card.get("comboConcentration",1))

func is_strike(card: Dictionary) -> bool:
	return Actions.components(card).any(func(part): return part.get("category", "") == "attack")

func is_guard(card: Dictionary) -> bool:
	return card.get("blocks", false)

func contact(card: Dictionary, opposing: Dictionary) -> float:
	if card.get("counter", false): return 1.0 if is_strike(opposing) else 0.0
	if is_guard(opposing) or opposing.get("evades", false): return 0.0
	return 0.5 if is_strike(opposing) else 1.0

func cost(f: Dictionary, placed: Array, mod: Dictionary = {}, opposing: Array = []) -> Dictionary:
	return combos.expenses(f, placed, mod, opposing)

func validate(f: Dictionary, placed: Array, mod: Dictionary = {}, opposing: Array = []) -> String:
	var used: Array = []
	var ids: Array = []
	for p in placed:
		var card = card_by_id(f, p.id)
		if card.is_empty() or p.id in ids: return "Карта недоступна."
		if p.rotation < 0 or p.rotation > 3: return "Некорректный поворот."
		for n in cells(card, p, mod):
			if n < 0 or n in used: return "Фигуры пересекаются или выходят за край поля."
			used.append(n)
		ids.append(p.id)
	if cost(f, placed, mod, opposing).remaining < 0: return "Не хватает выносливости."
	return ""

func level_damage_factor(card: Dictionary) -> float:
	return card.get("healthDamage", {}).get("stats", []).size() * catalog.balance.damage.levelPerRequiredStat \
		* (1.0 + maxf(0, float(card.get("sourceTier", 0))) * catalog.balance.damage.get("perTier", 0.0))

func unrounded_damage(f: Dictionary, card: Dictionary) -> float:
	if card.has("cellComponents"):
		var total = 0.0
		for part in Actions.components(card): total += unrounded_damage(f,part)
		return total
	var profile = card.get("healthDamage", {})
	if profile.is_empty(): return 0.0
	var invested = 0
	for stat in profile.stats: invested += maxi(0, catalog.effective_stat(f, stat) - 1)
	return maxf(0.0, profile.base + invested * catalog.balance.damage.perStatPoint \
		+ maxi(0, int(card.get("sourceLevel", 1)) - 1) * level_damage_factor(card))

func parts(f: Dictionary, card: Dictionary) -> Array:
	if card.has("cellComponents"):
		var all: Array = []
		for part in Actions.components(card): all.append_array(parts(f,part))
		return all
	var profile = card.get("healthDamage", {})
	if profile.is_empty(): return []
	var total = roundi(unrounded_damage(f, card))
	var weight = 0.0
	for n in profile.types.values(): weight += n
	if weight <= 0: return []
	var result: Array = []
	var spare = total
	for type in profile.types:
		var exact = total * float(profile.types[type]) / weight
		var value = floori(exact)
		spare -= value
		result.append({"type": type, "value": value, "remainder": exact - value, "order": result.size()})
	var ordered = result.duplicate()
	ordered.sort_custom(func(a, b): return a.remainder > b.remainder if a.remainder != b.remainder else a.order < b.order)
	for i in spare: ordered[i].value += 1
	return result

func armor(f: Dictionary, type: String) -> float:
	var total = 0.0
	for reference in f.gear.values():
		if reference: total += catalog.item(reference).get("defense", {}).get(type, 0)
	return total

func damage_multiplier(side: String, f: Dictionary = {}) -> float:
	var species = catalog.lookup(catalog.creatures, f.get("creatureId", ""))
	var species_multiplier = maxf(0.0, float(species.get("damageMultiplier", 1.0)))
	return species_multiplier * (enemy_damage_multiplier if side == "enemy" else 1.0)

## Largest-remainder allocation in tenths, matching the browser. Cell losses add
## up to the actual capped loss, even for lethal hits and fractional armor damage.
func distribute_damage(total: float, weights: Array) -> Array:
	var result: Array = []
	result.resize(weights.size())
	result.fill(0.0)
	var sum = 0.0
	for weight in weights: sum += weight
	var units = roundi(total * 10)
	if sum <= 0 or units <= 0: return result
	var remaining = units
	var order: Array = []
	for i in weights.size():
		var exact = weights[i] / sum * units
		result[i] = floorf(exact)
		remaining -= int(result[i])
		order.append({"index": i, "remainder": exact - result[i]})
	order.sort_custom(func(a, b): return a.remainder > b.remainder if a.remainder != b.remainder else a.index < b.index)
	for i in remaining: result[order[i].index] += 1
	return result.map(func(value): return value / 10.0)

func calculate(fighters: Dictionary, moves: Dictionary, mods: Dictionary, details: bool = false) -> Dictionary:
	var layers = {}
	var damage = {"player": 0.0, "enemy": 0.0}
	var stamina_damage = {"player": 0.0, "enemy": 0.0}
	var incoming = {"player": [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0], "enemy": [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]} if details else {}
	var incoming_stamina = incoming.duplicate(true)
	var breakdown = {"player": [{}, {}, {}, {}, {}, {}, {}, {}, {}], "enemy": [{}, {}, {}, {}, {}, {}, {}, {}, {}]} if details else {}
	var contexts = {}
	var expenses = {}
	var refunds = {"player": 0.0, "enemy": 0.0}
	for side in ["player", "enemy"]:
		contexts[side] = combos.build(fighters[side], moves[side], mods[side])
		layers[side] = contexts[side].layer
	for side in ["player", "enemy"]:
		var target = "enemy" if side == "player" else "player"
		expenses[side] = combos.expenses(fighters[side],moves[side],mods[side],layers[target],contexts[side])
		var multiplier = damage_multiplier(side, fighters[side])
		for n in 9:
			var card = layers[side][n]
			var attacks: Array = []
			var total_health = 0.0
			var total_stamina = 0.0
			for action in Actions.components(card):
				if not is_strike(action) and not action.get("counter", false): continue
				var q = concentration(action, mods[side])
				var bonus_multiplier = 1.0
				var ignore_armor = 0.0
				for combo in contexts[side].combos:
					if n not in combo.affected or not combos.active(combo,layers[target]): continue
					if combos.role(fighters[side],action) == "weaponAttack": bonus_multiplier *= combo.effect.get("healthMultiplier",1.0)
					ignore_armor = maxf(ignore_armor,combo.effect.get("armorIgnore",0.0))
				var per_cell = 0.0
				var damage_parts: Array = []
				for part in parts(fighters[side], action):
					var rating = maxf(0, armor(fighters[target], part.type)) * (1.0-ignore_armor)
					var mitigated = part.value * catalog.armor_damage_factor(rating) * bonus_multiplier
					per_cell += mitigated
					if details: damage_parts.append({"type":part.type,"raw":part.value,"armor":rating,"afterArmor":mitigated})
				var factor = contact(action, layers[target][n]) * q * multiplier
				var hp = per_cell * factor
				var sp = stamina_damage_per_cell(fighters[side], action) * factor
				total_health += hp
				total_stamina += sp
				if details: attacks.append({"parts":damage_parts,"concentration":q,"contact":contact(action,layers[target][n]),"damageMultiplier":multiplier,"health":hp,"stamina":sp})
			damage[target] += total_health
			stamina_damage[target] += total_stamina
			if details and not attacks.is_empty():
				incoming[target][n] += total_health
				incoming_stamina[target][n] += total_stamina
				var summary = attacks[0].duplicate(true)
				for extra in attacks.slice(1): summary.parts.append_array(extra.parts)
				summary.health = total_health
				summary.stamina = total_stamina
				if attacks.size() > 1: summary.components = attacks
				breakdown[side][n] = summary
		for combo in contexts[side].combos:
			if not combos.active(combo,layers[target]): continue
			var extra = float(combo.effect.get("staminaDamage",0)) * multiplier
			stamina_damage[target] += extra
			if details and extra > 0:
				# Attribute the once-per-combination effect to a successful kick cell.
				for n in combo.groups[0].cells:
					if contact(combo.groups[0].card,layers[target][n]) > 0:
						incoming_stamina[target][n] += extra
						breakdown[side][n].stamina += extra
						break
			refunds[side] += minf(combo.effect.get("staminaRefund",0),combo.groups[0].card.get("staminaCost",0))
	var result = {}
	for side in ["player", "enemy"]:
		var f = fighters[side]
		var target = "enemy" if side == "player" else "player"
		var expense = expenses[side]
		var lost = minf(f.hp, snappedf(damage[side], 0.1))
		var hp_after = maxf(0, snappedf(f.hp - lost, 0.1))
		var healing = 0.0
		for p in moves[side]: healing += catalog.figure_healing(f, card_by_id(f, p.id))
		var healed = minf(healing, catalog.max_hp(f) - hp_after) if hp_after > 0 else 0.0
		hp_after += healed
		var loss = minf(maxf(0, expense.remaining), stamina_damage[side])
		var resting = moves[side].is_empty() and hp_after > 0
		var refunded = minf(refunds[side],catalog.max_stamina(f)-maxf(0,expense.remaining-loss)) if hp_after > 0 else 0.0
		result[side] = {"hpBefore": f.hp, "hpAfter": hp_after, "damage": lost, "healed": healed, "staminaLoss": loss,
			"staminaAfter": catalog.max_stamina(f) if resting else maxf(0, expense.remaining - loss) + refunded,
			"comboRefund": refunded,
			"exhausted": stamina_damage[side] > 0 and expense.remaining - stamina_damage[side] <= 0 and not resting,
			"staminaBefore": f.stamina, "available": expense.remaining, "attackCost": expense.attacks, "blockCost": expense.blocks,
			"staminaRecovered": catalog.max_stamina(f) - maxf(0, expense.remaining - loss) if resting else 0.0, "cost": expense.total}
	if details:
		var health = {}
		var stamina = {}
		for side in ["player", "enemy"]:
			health[side] = distribute_damage(result[side].damage, incoming[side])
			stamina[side] = distribute_damage(result[side].staminaLoss, incoming_stamina[side])
		result.cells = []
		for n in 9:
			result.cells.append({"index": n, "known": true,
				"player": layers.player[n].duplicate(true), "enemy": layers.enemy[n].duplicate(true),
				"playerDamage": health.player[n], "enemyDamage": health.enemy[n],
				"playerStaminaDamage": stamina.player[n], "enemyStaminaDamage": stamina.enemy[n],
				"playerAttack": breakdown.player[n], "enemyAttack": breakdown.enemy[n],
				"playerCombos": combos.cell_combos(contexts.player,n,layers.enemy),
				"enemyCombos": combos.cell_combos(contexts.enemy,n,layers.player),
				"playerBlockCost": expenses.player.cells[n],
				"enemyBlockCost": expenses.enemy.cells[n]})
	return result

## Presentation may inspect only public moves. Never plan AI or advance RNG here.
func forecast(g: Dictionary, draft: Array) -> Dictionary:
	var plan = g.clashPlan
	var known = plan.stage == "reveal" or plan.preparer == "enemy"
	var moves = plan.playerPlaced if plan.stage == "reveal" else draft
	var opposing = combos.build(g.enemy, plan.enemyPlaced, plan.enemyModifiers).layer if known else []
	var expense = cost(g.player, moves, plan.playerModifiers, opposing)
	if known:
		var calc = calculate(g, {"player": moves, "enemy": plan.enemyPlaced}, {"player": plan.playerModifiers, "enemy": plan.enemyModifiers}, true)
		return {"known": true, "cost": expense, "calculation": calc, "cells": calc.cells}
	var own_context = combos.build(g.player,moves,plan.playerModifiers)
	var own = own_context.layer
	# Public, provisional damage against open cells. Reuse armor, compression,
	# rounding and resource caps; never inspect the hidden placement or roll AI.
	var estimate = calculate(g, {"player": moves, "enemy": []}, {"player": plan.playerModifiers, "enemy": {}}, true)
	var result: Array = []
	for n in 9:
		var card = own[n]
		var potential = 0.0
		var multiplier = concentration(card,plan.playerModifiers) if not card.is_empty() else 1.0
		if is_strike(card):
			for part in parts(g.player, card): potential += part.value * multiplier
		result.append({"index": n, "known": false, "player": card, "enemy": {}, "potential": potential,
			"potentialStamina": stamina_damage_per_cell(g.player, card) * multiplier if is_strike(card) else 0,
			"playerCombos": combos.cell_combos(own_context,n,[{},{},{},{},{},{},{},{},{}],false), "enemyCombos": [],
			"previewDamage": estimate.cells[n].enemyDamage, "previewStaminaDamage": estimate.cells[n].enemyStaminaDamage})
	return {"known": false, "cost": expense, "calculation": {}, "estimate": estimate, "cells": result}

func options(card: Dictionary, used: Array, mod: Dictionary) -> Array:
	var result: Array = []
	for rotation in 4:
		for y in 3:
			for x in 3:
				var p = {"id": card.id, "x": x, "y": y, "rotation": rotation}
				var valid = true
				for n in cells(card, p, mod):
					if n < 0 or n in used: valid = false
				if valid: result.append(p)
	return result

func ai_score(g: Dictionary, moves: Array, known: bool) -> float:
	var plan = g.clashPlan
	var calc = calculate(g, {"player": plan.playerPlaced if known else [], "enemy": moves}, {"player": plan.playerModifiers if known else {}, "enemy": plan.enemyModifiers})
	var weights = catalog.combos.ai
	var score = calc.player.damage - calc.enemy.damage + calc.enemy.healed
	score += weights.staminaWeight * (calc.player.staminaLoss - calc.enemy.staminaLoss)
	score += weights.reserveWeight * calc.enemy.staminaAfter
	if calc.player.hpAfter <= 0: score += weights.lethalScore
	if calc.enemy.hpAfter <= 0: score -= weights.lethalScore * 1.2
	if not known:
		# Value public geometry only, never read the hero's hidden hand or moves.
		score += combos.build(g.enemy,moves,plan.enemyModifiers).combos.size() * weights.setupWeight
	return score

func plan_ai(g: Dictionary) -> Array:
	var plan = g.clashPlan
	var known = plan.preparer == "player"
	var opposing = combos.build(g.player,plan.playerPlaced,plan.playerModifiers).layer if known else []
	var width = int(catalog.combos.ai.beamWidth)
	var beam: Array = [{"moves": [], "used": [], "ids": [], "score": ai_score(g,[],known)}]
	var best = beam[0]
	# Search across card order too: a defensive first piece may enable a strong
	# second or third piece. Keep partial plans and legal rest as candidates.
	for depth in g.enemy.deck.hand.size():
		var next: Array = []
		var seen = {}
		for candidate in beam:
			for card in g.enemy.deck.hand:
				if card.id in candidate.ids: continue
				var unique = {}
				var placements = options(card,candidate.used,plan.enemyModifiers)
				for p in placements:
					var indices = cells(card,p,plan.enemyModifiers)
					indices.sort()
					# A symmetric outline can still have different attack/guard orientations.
					var geometry = str(cells(card,p,plan.enemyModifiers)) if Actions.mixed(card) else str(indices)
					if unique.has(geometry): continue
					unique[geometry] = true
					var moves = candidate.moves + [p]
					var key_parts: Array = []
					for move in moves: key_parts.append(str(move))
					key_parts.sort()
					var key = str(key_parts)
					if seen.has(key): continue
					seen[key] = true
					if cost(g.enemy,moves,plan.enemyModifiers,opposing).remaining < 0: continue
					var score = ai_score(g,moves,known)
					var entry = {"moves":moves,"used":candidate.used+indices,"ids":candidate.ids+[card.id],"score":score}
					next.append(entry)
					if score > best.score: best = entry
		if next.is_empty(): break
		next.sort_custom(func(a,b): return a.score > b.score)
		beam = next.slice(0,width)
	return best.moves

func prepare(g: Dictionary):
	if g.phase != "combat" or g.has("clashPlan"): return
	var reactor = turn_reactor(g)
	var preparer = "enemy" if reactor == "player" else "player"
	g.lastReactor = reactor
	g.clashPlan = {"stage": "preparation" if preparer == "player" else "reaction", "preparer": preparer, "reactor": reactor,
		"playerPlaced": [], "enemyPlaced": [], "playerModifiers": {}, "enemyModifiers": {}}
	if preparer == "enemy": g.clashPlan.enemyPlaced = plan_ai(g)

func begin(g: Dictionary):
	g.erase("combatHelpAcknowledged")
	g.erase("clashPlan")
	g.erase("lastReactor")
	g.erase("victoryReward")
	g.rewardOptions = []
	g.round = 1
	g.phase = "combat"
	g.log = []
	for side in ["player", "enemy"]:
		g[side].battleMode = g.journey.battleMode
		start_deck(g[side])
	prepare(g)

func submit(g: Dictionary, placed: Array) -> String:
	if g.phase != "combat" or not g.has("clashPlan"): return "Бой завершён."
	var p = g.clashPlan
	if p.stage != "reveal":
		var opposing = combos.build(g.enemy, p.enemyPlaced, p.enemyModifiers).layer if p.preparer == "enemy" else []
		var error = validate(g.player, placed, p.playerModifiers, opposing)
		if error: return error
		p.playerPlaced = placed.duplicate(true)
		if p.preparer == "player":
			p.enemyPlaced = plan_ai(g)
			p.stage = "reveal"
			return ""
	var calc = calculate(g, {"player": p.playerPlaced, "enemy": p.enemyPlaced}, {"player": p.playerModifiers, "enemy": p.enemyModifiers}, true)
	g.log = [{"round": g.round, "summary": calc, "placements": p.duplicate(true)}]
	for side in ["player", "enemy"]:
		g[side].hp = calc[side].hpAfter
		g[side].stamina = calc[side].staminaAfter
		g[side].exhausted = calc[side].exhausted
		spend(g[side], p.playerPlaced if side == "player" else p.enemyPlaced)
	if g.player.hp <= 0 and g.enemy.hp <= 0: g.phase = "draw"
	elif g.enemy.hp <= 0: g.phase = "victory"
	elif g.player.hp <= 0: g.phase = "defeat"
	g.round += 1
	g.erase("clashPlan")
	if g.phase == "combat":
		for side in ["player", "enemy"]:
			if not g[side].exhausted: g[side].stamina = minf(catalog.max_stamina(g[side]), g[side].stamina + catalog.balance.stamina.recovery)
		prepare(g)
	return ""

func exchange(g: Dictionary, id: String) -> String:
	if g.phase != "combat" or g.clashPlan.stage == "reveal": return "Обмен сейчас недоступен."
	var f = g.player
	var deck = f.deck
	var card = card_by_id(f, id)
	if card.is_empty() or deck.exchanged or f.stamina < catalog.balance.stamina.exchangeCost: return "Нужны карта и 1 выносливости; один обмен за ход."
	if deck.draw.is_empty():
		if deck.discard.is_empty(): return "Стопка пуста."
		deck.draw = shuffled(deck.discard)
		deck.discard = []
	var index = deck.hand.find(card)
	var replacement = deck.draw.pop_front()
	deck.discard.append(card)
	deck.hand[index] = replacement
	deck.exchanged = true
	f.stamina -= catalog.balance.stamina.exchangeCost
	return ""

func stamina_damage_per_cell(f: Dictionary, card: Dictionary) -> float:
	if card.has("cellComponents"):
		var total = 0.0
		for part in Actions.components(card): total += stamina_damage_per_cell(f,part)
		return total
	var profile = card.get("staminaDamage", {})
	if profile.is_empty(): return card.get("staminaDamagePerCell", 0)
	var invested = 0
	for stat in profile.stats: invested += maxi(0, catalog.effective_stat(f, stat) - 1)
	return maxf(0, roundf(profile.base + invested * profile.perStatPoint))

func turn_reactor(g: Dictionary) -> String:
	var player = catalog.turn_order(g.player)
	var enemy = catalog.turn_order(g.enemy)
	if not player.is_empty() and player != enemy: return "enemy" if player == "first" else "player"
	if not enemy.is_empty() and player != enemy: return "player" if enemy == "first" else "enemy"
	if g.has("lastReactor"): return "enemy" if g.lastReactor == "player" else "player"
	return "player" if rng.randf() < 0.5 else "enemy"
