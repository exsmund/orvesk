extends RefCounted
## Shared control player: greedy current-turn play, no hidden information or lookahead.
static func score(combat, g: Dictionary, moves: Array, visible_enemy: Array) -> float:
	var calc = combat.calculate(g, {"player": moves, "enemy": visible_enemy}, {"player": {}, "enemy": g.clashPlan.enemyModifiers})
	return calc.enemy.damage - calc.player.damage + 0.25 * calc.enemy.staminaLoss + moves.size() * 0.01

static func plan(combat, g: Dictionary) -> Array:
	var p = g.clashPlan
	var reacting = p.preparer == "enemy"
	# Never inspect the hidden enemy hand, draw order or unrevealed placements.
	var visible_enemy: Array = p.enemyPlaced if reacting else []
	var opposing = combat.layer(g.enemy, visible_enemy, p.enemyModifiers) if reacting else []
	var moves: Array = []
	var occupied: Array = []
	var current = score(combat, g, moves, visible_enemy)
	while true:
		var best: Dictionary = {}
		var best_cells: Array = []
		var best_score = current
		for card in g.player.deck.hand:
			if moves.any(func(m): return m.id == card.id): continue
			for placement in combat.shuffled(combat.options(card, occupied, {})):
				var next = moves + [placement]
				if combat.cost(g.player, next, {}, opposing).remaining < 0: continue
				var value = score(combat, g, next, visible_enemy)
				if value > best_score:
					best = placement
					best_cells = combat.cells(card, placement)
					best_score = value
		if best.is_empty(): return moves
		moves.append(best)
		occupied.append_array(best_cells)
		current = best_score
	return moves
