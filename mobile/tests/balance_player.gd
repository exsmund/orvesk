extends RefCounted
## Tactical fixtures for the control player; combat outcomes use the real engine.
const Catalog = preload("res://game/catalog.gd")
const Combat = preload("res://game/combat.gd")
const MemoCombat = preload("res://tests/balance_combat.gd")
const Session = preload("res://game/session.gd")
const Player = preload("res://tests/first_map_player.gd")

static func run() -> Array:
	var checks: Array = []
	for memoized in [false, true]:
		var data = Catalog.new()
		# Tactical fixture coefficients stay fixed when live difficulty is tuned.
		var session = Session.new(data)
		var hero = session.fighter("Control", session.initial_creation_stats())
		var enemy = session.fighter("Opponent", session.initial_creation_stats())
		hero.hp = 100.0
		enemy.hp = 100.0
		hero.stamina = 2.0
		enemy.stamina = 8.0
		hero.deck = {"hand": [], "draw": [], "discard": []}
		enemy.deck = {"hand": [], "draw": [], "discard": []}
		var type = data.read_json("damage-types").keys()[0]
		var cheap = attack("cheap", 2, 1, type)
		var strong = attack("strong", 4, 20, type)
		hero.deck.hand = [cheap, strong]
		var g = {"player": hero, "enemy": enemy, "clashPlan": {
			"preparer": "player", "enemyPlaced": [], "enemyModifiers": {}}}
		var combat = MemoCombat.new(data) if memoized else Combat.new(data)
		combat.enemy_damage_multiplier = 1.0
		if memoized: combat.reset(hero, enemy)
		checks.append([Player.plan(combat, g).is_empty(), "Rest instead of weak attack when it unlocks a held strong attack"])
		# With six stamina, spending the last two on a weak follow-up prevents
		# playing the second strong card after ordinary recovery on the next turn.
		hero.stamina = 6.0
		hero.deck.hand.append(attack("second-strong", 4, 20, type))
		var moves = Player.plan(combat, g)
		checks.append([moves.size() == 1 and moves[0].id != "cheap", "Preserve stamina instead of adding a weak follow-up"])
		hero.stamina = 2.0
		enemy.hp = 1.0
		moves = Player.plan(combat, g)
		checks.append([moves.size() == 1 and moves[0].id == "cheap", "Take a cheap lethal attack instead of resting"])
		enemy.hp = 100.0
		hero.hp = 20.0
		enemy.deck.hand = [attack("threat", 2, 25, type)]
		g.clashPlan.preparer = "enemy"
		g.clashPlan.enemyPlaced = [{"id": "threat", "x": 0, "y": 0, "rotation": 0}]
		moves = Player.plan(combat, g)
		var calc = combat.calculate(g, {"player": moves, "enemy": g.clashPlan.enemyPlaced}, {"player": {}, "enemy": {}})
		checks.append([not moves.is_empty() and calc.player.hpAfter > 0, "Defend against visible lethal damage instead of resting"])
		checks.append([combat.validate(hero, moves, {}, combat.layer(enemy, g.clashPlan.enemyPlaced)).is_empty(), "Chosen reaction is legal"])
		g.clashPlan.preparer = "player"
		combat.rng.seed = 314
		var snapshot = g.duplicate(true)
		var before = Player.plan(combat, g)
		checks.append([g == snapshot, "Planning never changes fighters, hands, resources or placement"])
		hero.deck.draw = [attack("unseen-draw", 0, 10000, type)]
		enemy.deck.hand = [attack("hidden-enemy", 0, 10000, type)]
		g.clashPlan.enemyPlaced = [{"id": "hidden-enemy", "x": 1, "y": 1, "rotation": 0}]
		combat.rng.seed = 314
		checks.append([Player.plan(combat, g) == before, "Recovery decision ignores hidden cards, draw order and placements"])
	return checks

static func attack(id: String, cost: int, damage: int, type: String) -> Dictionary:
	return {"id": id, "shape": [[0, 0]], "category": "attack", "staminaCost": cost,
		"healthDamage": {"base": damage, "stats": [], "types": {type: 1}}}
