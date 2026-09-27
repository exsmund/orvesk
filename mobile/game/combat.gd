extends RefCounted
## Pure rules: no nodes, rendering, filesystem or HTTP.
var catalog
var rng = RandomNumberGenerator.new()

func _init(data):
	catalog = data
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
		if availability == "emptyWeapon" and f.gear.weapon: continue
		if availability == "emptyFeet" and f.gear.feet: continue
		if availability == "emptyShield" and (f.gear.shield or catalog.item(f.gear.weapon).get("hands", 1) == 2): continue
		var card = definition.duplicate(true)
		card.id = "base:" + definition.id
		card.sourceLevel = 1
		if card.get("naturalLevel", false):
			var stats = card.get("healthDamage", {}).get("stats", [])
			if not stats.is_empty():
				card.sourceLevel = 999
				for stat in stats: card.sourceLevel = mini(card.sourceLevel, f.stats[stat])
		result.append(card)
	for slot in catalog.SLOTS:
		if not f.gear.get(slot): continue
		var equipment = catalog.item(f.gear[slot])
		if equipment.get("charmEffect", ""): continue
		for definition in equipment.figures:
			var card = definition.duplicate(true)
			card.id = equipment.id + ":" + definition.id
			card.sourceLevel = equipment.level
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

func fill_hand(f: Dictionary):
	var deck = f.deck
	while deck.hand.size() < catalog.balance.handSize:
		if deck.draw.is_empty():
			if f.get("battleMode", "free") == "expendable" or deck.discard.is_empty(): break
			deck.draw = shuffled(deck.discard)
			deck.discard = []
		deck.hand.append(deck.draw.pop_front())

func start_deck(f: Dictionary):
	f.deck = {"draw": shuffled(build_deck(f)), "hand": [], "discard": [], "exchanged": false}
	f.stamina = catalog.balance.stamina.max
	f.exhausted = false
	f.actionsFinished = false
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
		for cell in cells(card, p, mod):
			if cell >= 0: result[cell] = card
	return result

func is_strike(card: Dictionary) -> bool:
	return not card.is_empty() and card.get("category", "") == "attack"

func is_guard(card: Dictionary) -> bool:
	return card.get("blocks", false)

func contact(card: Dictionary, opposing: Dictionary) -> float:
	if card.get("counter", false): return 1.0 if is_strike(opposing) else 0.0
	if is_guard(opposing) or opposing.get("evades", false): return 0.0
	return 0.5 if is_strike(opposing) else 1.0

func cost(f: Dictionary, placed: Array, mod: Dictionary = {}, opposing: Array = []) -> Dictionary:
	var attacks = 0.0
	var blocks = 0.0
	for p in placed:
		var card = card_by_id(f, p.id)
		attacks += card.get("staminaCost", 0)
		for n in cells(card, p, mod):
			if opposing.is_empty() or (n >= 0 and is_strike(opposing[n])):
				blocks += card.get("blockCost", 0)
	return {"attacks": attacks, "blocks": blocks, "total": attacks + blocks, "remaining": f.stamina - attacks - blocks}

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

func parts(f: Dictionary, card: Dictionary) -> Array:
	var profile = card.get("healthDamage", {})
	if profile.is_empty(): return []
	var invested = 0
	for stat in profile.stats: invested += maxi(0, int(f.stats[stat]) - 1)
	var total = maxi(0, roundi(profile.base + invested * catalog.balance.damage.perStatPoint + profile.stats.size() * maxi(0, int(card.get("sourceLevel", 1)) - 1) * catalog.balance.damage.levelPerRequiredStat))
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
	for side in ["player", "enemy"]: layers[side] = layer(fighters[side], moves[side], mods[side])
	for side in ["player", "enemy"]:
		var target = "enemy" if side == "player" else "player"
		for p in moves[side]:
			var card = card_by_id(fighters[side], p.id)
			if not is_strike(card) and not card.get("counter", false): continue
			var indices = cells(card, p, mods[side])
			var concentration = float(card.shape.size()) / indices.size()
			var per_cell = 0.0
			var damage_parts: Array = []
			for part in parts(fighters[side], card):
				var rating = maxf(0, armor(fighters[target], part.type))
				var mitigated = part.value * catalog.balance.armorK / (catalog.balance.armorK + rating)
				per_cell += mitigated
				if details: damage_parts.append({"type": part.type, "raw": part.value, "armor": rating, "afterArmor": mitigated})
			for n in indices:
				var factor = contact(card, layers[target][n]) * concentration
				damage[target] += per_cell * factor
				stamina_damage[target] += card.get("staminaDamagePerCell", 0) * factor
				if details:
					incoming[target][n] += per_cell * factor
					incoming_stamina[target][n] += card.get("staminaDamagePerCell", 0) * factor
					breakdown[side][n] = {"parts": damage_parts, "concentration": concentration, "contact": contact(card, layers[target][n]), "health": per_cell * factor, "stamina": card.get("staminaDamagePerCell", 0) * factor}
	var result = {}
	for side in ["player", "enemy"]:
		var f = fighters[side]
		var target = "enemy" if side == "player" else "player"
		var expense = cost(f, moves[side], mods[side], layers[target])
		var lost = minf(f.hp, snappedf(damage[side], 0.1))
		var hp_after = maxf(0, snappedf(f.hp - lost, 0.1))
		var healing = 0.0
		for p in moves[side]: healing += card_by_id(f, p.id).get("healing", 0)
		var healed = minf(healing, catalog.max_hp(f) - hp_after) if hp_after > 0 else 0.0
		hp_after += healed
		var loss = minf(maxf(0, expense.remaining), stamina_damage[side])
		var resting = moves[side].is_empty() and hp_after > 0
		result[side] = {"hpBefore": f.hp, "hpAfter": hp_after, "damage": lost, "healed": healed, "staminaLoss": loss,
			"staminaAfter": catalog.balance.stamina.max if resting else maxf(0, expense.remaining - loss),
			"exhausted": stamina_damage[side] > 0 and expense.remaining - stamina_damage[side] <= 0 and not resting,
			"staminaBefore": f.stamina, "available": expense.remaining, "attackCost": expense.attacks, "blockCost": expense.blocks,
			"staminaRecovered": catalog.balance.stamina.max - maxf(0, expense.remaining - loss) if resting else 0.0, "cost": expense.total}
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
				"playerBlockCost": layers.player[n].get("blockCost", 0) if is_strike(layers.enemy[n]) else 0,
				"enemyBlockCost": layers.enemy[n].get("blockCost", 0) if is_strike(layers.player[n]) else 0})
	return result

## Presentation may inspect only public moves. Never plan AI or advance RNG here.
func forecast(g: Dictionary, draft: Array) -> Dictionary:
	var plan = g.clashPlan
	var known = plan.stage == "reveal" or plan.preparer == "enemy"
	var moves = plan.playerPlaced if plan.stage == "reveal" else draft
	var opposing = layer(g.enemy, plan.enemyPlaced, plan.enemyModifiers) if known else []
	var expense = cost(g.player, moves, plan.playerModifiers, opposing)
	if known:
		var calc = calculate(g, {"player": moves, "enemy": plan.enemyPlaced}, {"player": plan.playerModifiers, "enemy": plan.enemyModifiers}, true)
		return {"known": true, "cost": expense, "calculation": calc, "cells": calc.cells}
	var own = layer(g.player, moves, plan.playerModifiers)
	var result: Array = []
	for n in 9:
		var card = own[n]
		var potential = 0.0
		var multiplier = card.get("shape", []).size() if plan.playerModifiers.get("compressed", "") == card.get("id", "-") else 1
		if is_strike(card):
			for part in parts(g.player, card): potential += part.value * multiplier
		result.append({"index": n, "known": false, "player": card, "enemy": {}, "potential": potential,
			"potentialStamina": card.get("staminaDamagePerCell", 0) * multiplier if is_strike(card) else 0})
	return {"known": false, "cost": expense, "calculation": {}, "cells": result}

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

func plan_ai(g: Dictionary) -> Array:
	var plan = g.clashPlan
	if g.enemy.get("actionsFinished", false): return []
	var known = plan.preparer == "player"
	var opposing = layer(g.player, plan.playerPlaced, plan.playerModifiers) if known else []
	var candidates: Array = []
	for _attempt in 16:
		var moves: Array = []
		var used: Array = []
		for card in shuffled(g.enemy.deck.hand):
			var legal: Array = []
			for p in shuffled(options(card, used, plan.enemyModifiers)):
				if cost(g.enemy, moves + [p], plan.enemyModifiers, opposing).remaining >= 0: legal.append(p)
			if legal.is_empty(): continue
			var best: Dictionary = {}
			var best_score = -INF
			for p in legal.slice(0, 16):
				var score = 0.0
				if known:
					var calc = calculate(g, {"player": plan.playerPlaced, "enemy": moves + [p]}, {"player": plan.playerModifiers, "enemy": plan.enemyModifiers})
					score = calc.player.damage - calc.enemy.damage + 0.5 * (calc.player.staminaLoss - calc.enemy.staminaLoss) + rng.randf()
				else:
					for part in parts(g.enemy, card): score += part.value * card.shape.size()
					score += rng.randf() * 3
				if score > best_score:
					best = p
					best_score = score
			moves.append(best)
			used.append_array(cells(card, best, plan.enemyModifiers))
		var calc = calculate(g, {"player": plan.playerPlaced if known else [], "enemy": moves}, {"player": plan.playerModifiers, "enemy": plan.enemyModifiers})
		candidates.append({"moves": moves, "score": calc.player.damage - calc.enemy.damage + 0.5 * (calc.player.staminaLoss - calc.enemy.staminaLoss)})
	candidates.sort_custom(func(a, b): return a.score > b.score)
	return candidates[rng.randi_range(0, mini(2, candidates.size() - 1))].moves

func prepare(g: Dictionary):
	if g.phase != "combat" or g.has("clashPlan"): return
	var reactor = ("enemy" if g.lastReactor == "player" else "player") if g.has("lastReactor") else ("player" if rng.randf() < 0.5 else "enemy")
	var preparer = "enemy" if reactor == "player" else "player"
	g.lastReactor = reactor
	g.clashPlan = {"stage": "preparation" if preparer == "player" else "reaction", "preparer": preparer, "reactor": reactor,
		"playerPlaced": [], "enemyPlaced": [], "playerModifiers": {}, "enemyModifiers": {}}
	if preparer == "enemy": g.clashPlan.enemyPlaced = plan_ai(g)

func begin(g: Dictionary):
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
		var opposing = layer(g.enemy, p.enemyPlaced, p.enemyModifiers) if p.preparer == "enemy" else []
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
	elif g.journey.battleMode == "expendable" and not has_actions(g, "player") and not has_actions(g, "enemy"):
		g.phase = "victory" if g.player.hp > g.enemy.hp else ("defeat" if g.player.hp < g.enemy.hp else "draw")
	g.round += 1
	g.erase("clashPlan")
	if g.phase == "combat":
		for side in ["player", "enemy"]:
			if not g[side].exhausted: g[side].stamina = minf(catalog.balance.stamina.max, g[side].stamina + catalog.balance.stamina.recovery)
		prepare(g)
	return ""

func has_actions(g: Dictionary, side: String) -> bool:
	var f = g[side]
	if f.get("actionsFinished", false): return false
	var other = g.enemy if side == "player" else g.player
	var opposing_strike = false
	if not other.get("actionsFinished", false):
		for card in other.deck.hand + other.deck.draw:
			if is_strike(card): opposing_strike = true
	for card in f.deck.hand + f.deck.draw:
		if is_strike(card) or (card.get("counter", false) and opposing_strike) or (card.get("healing", 0) > 0 and f.hp < catalog.max_hp(f)): return true
	return false

func exchange(g: Dictionary, id: String) -> String:
	if g.phase != "combat" or g.clashPlan.stage == "reveal": return "Обмен сейчас недоступен."
	var f = g.player
	var deck = f.deck
	var card = card_by_id(f, id)
	if card.is_empty() or deck.exchanged or f.stamina < catalog.balance.stamina.exchangeCost: return "Нужны карта и 1 выносливости; один обмен за ход."
	if deck.draw.is_empty():
		if f.battleMode == "expendable" or deck.discard.is_empty(): return "Стопка пуста."
		deck.draw = shuffled(deck.discard)
		deck.discard = []
	var index = deck.hand.find(card)
	var replacement = deck.draw.pop_front()
	deck.discard.append(card)
	deck.hand[index] = replacement
	deck.exchanged = true
	f.stamina -= catalog.balance.stamina.exchangeCost
	return ""
