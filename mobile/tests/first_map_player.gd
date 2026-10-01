extends RefCounted
## Shared control player: public current-turn forecast plus stamina opportunity cost.
const FUTURE_DISCOUNT = 0.5

static func future_attacks(combat, g: Dictionary) -> Array:
	# Value only attacks already in our hand. Never predict draws or an enemy move.
	var result: Array = []
	for card in g.player.deck.hand:
		var options = combat.options(card, [], {})
		if options.is_empty(): continue
		var placement = options[0]
		var calc = combat.calculate(g, {"player": [placement], "enemy": []}, {"player": {}, "enemy": {}})
		if calc.enemy.damage <= 0: continue
		result.append({"id": card.id, "cost": combat.cost(g.player, [placement]).total, "damage": calc.enemy.damage})
	return result

static func score(combat, g: Dictionary, moves: Array, visible_enemy: Array, attacks: Array) -> Dictionary:
	var calc = combat.calculate(g, {"player": moves, "enemy": visible_enemy}, {"player": {}, "enemy": g.clashPlan.enemyModifiers})
	# A forecast win beats resource saving; surviving beats mutual death or defeat.
	var alive = calc.player.hpAfter > 0
	var enemy_alive = calc.enemy.hpAfter > 0
	var outcome = (1 if enemy_alive else 2) if alive else (-1 if enemy_alive else 0)
	var stamina = calc.player.staminaAfter
	if not calc.player.exhausted:
		stamina = minf(combat.catalog.max_stamina(g.player), stamina + combat.catalog.balance.stamina.recovery)
	var future = 0.0
	if alive and enemy_alive:
		for attack in attacks:
			if attack.cost > stamina or moves.any(func(m): return m.id == attack.id): continue
			future = maxf(future, minf(attack.damage, calc.enemy.hpAfter))
	return {"outcome": outcome, "value": calc.enemy.damage - calc.player.damage + calc.player.healed \
		+ 0.25 * calc.enemy.staminaLoss + FUTURE_DISCOUNT * future + moves.size() * 0.01}

static func better(candidate: Dictionary, current: Dictionary) -> bool:
	return candidate.outcome > current.outcome or (candidate.outcome == current.outcome and candidate.value > current.value)

static func plan(combat, g: Dictionary) -> Array:
	var p = g.clashPlan
	var reacting = p.preparer == "enemy"
	# Never inspect the hidden enemy hand, draw order or unrevealed placements.
	var visible_enemy: Array = p.enemyPlaced if reacting else []
	var opposing = combat.layer(g.enemy, visible_enemy, p.enemyModifiers) if reacting else []
	var attacks = future_attacks(combat, g)
	var moves: Array = []
	var occupied: Array = []
	# Empty placement receives its real full-rest result from the combat engine.
	var current = score(combat, g, moves, visible_enemy, attacks)
	while true:
		var best: Dictionary = {}
		var best_cells: Array = []
		var best_score = current
		for card in g.player.deck.hand:
			if moves.any(func(m): return m.id == card.id): continue
			for placement in combat.shuffled(combat.options(card, occupied, {})):
				var next = moves + [placement]
				if combat.cost(g.player, next, {}, opposing).remaining < 0: continue
				var value = score(combat, g, next, visible_enemy, attacks)
				if better(value, best_score):
					best = placement
					best_cells = combat.cells(card, placement)
					best_score = value
		if best.is_empty(): return moves
		moves.append(best)
		occupied.append_array(best_cells)
		current = best_score
	return moves
