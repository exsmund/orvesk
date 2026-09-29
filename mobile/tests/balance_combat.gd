extends "res://game/combat.gd"
## Per-battle memoization of immutable values, not a second combat implementation.
## Resolution, AI, RNG and scoring all remain in the production engine.
var actors: Array = []
var part_cache: Array = [{}, {}]
var armor_cache: Array = [{}, {}]
var stamina_cache: Array = [{}, {}]
var cell_cache: Dictionary = {}
var option_cache: Dictionary = {}
var calculation_cache: Dictionary = {}

func reset(player: Dictionary, enemy: Dictionary):
	actors = [player, enemy]
	part_cache = [{}, {}]
	armor_cache = [{}, {}]
	stamina_cache = [{}, {}]
	cell_cache.clear()
	option_cache.clear()
	calculation_cache.clear()

func prepare(g: Dictionary):
	calculation_cache.clear()
	super.prepare(g)

func cells(card: Dictionary, p: Dictionary, mod: Dictionary = {}) -> Array:
	var key = [card.shape, p.x, p.y, p.rotation, mod.get("compressed", "") == p.id]
	if not cell_cache.has(key): cell_cache[key] = super.cells(card, p, mod)
	return cell_cache[key]

func options(card: Dictionary, used: Array, mod: Dictionary) -> Array:
	var mask = 0
	for cell in used: mask |= 1 << int(cell)
	var key = [card.id, card.shape, mask, mod.get("compressed", "") == card.id]
	if not option_cache.has(key): option_cache[key] = super.options(card, used, mod)
	return option_cache[key]

func calculate(fighters: Dictionary, moves: Dictionary, mods: Dictionary, details: bool = false) -> Dictionary:
	# Actual turn resolution stays uncached; reuse repeated AI scoring queries only.
	if details: return super.calculate(fighters, moves, mods, details)
	var key: Array = []
	for actor in ["player", "enemy"]:
		key.append(fighters[actor].hp)
		key.append(fighters[actor].stamina)
		var placements: Array = []
		for p in moves[actor]:
			# Preserve summation order, including cell order, for identical rounding.
			placements.append([p.id, cells(card_by_id(fighters[actor], p.id), p, mods[actor])])
		key.append(placements)
		key.append(mods[actor].duplicate(true))
	if not calculation_cache.has(key): calculation_cache[key] = super.calculate(fighters, moves, mods)
	return calculation_cache[key]

func side(f: Dictionary) -> int:
	return 0 if is_same(f, actors[0]) else 1

func parts(f: Dictionary, card: Dictionary) -> Array:
	var cache = part_cache[side(f)]
	if not cache.has(card.id): cache[card.id] = super.parts(f, card)
	return cache[card.id]

func armor(f: Dictionary, type: String) -> float:
	var cache = armor_cache[side(f)]
	if not cache.has(type): cache[type] = super.armor(f, type)
	return cache[type]

func stamina_damage_per_cell(f: Dictionary, card: Dictionary) -> float:
	var cache = stamina_cache[side(f)]
	if not cache.has(card.id): cache[card.id] = super.stamina_damage_per_cell(f, card)
	return cache[card.id]
