extends RefCounted
## Geometry only uses original equipment figures. Generated cells never recurse.
var engine: WeakRef
var combat:
	get: return engine.get_ref()
var rules: Array
func _init(engine):
	self.engine = weakref(engine)
	rules = engine.catalog.combos.rules

func neighbors(n: int) -> Array:
	var result: Array = []
	for m in [n - 3, n - 1, n + 1, n + 3]:
		if m >= 0 and m < 9 and abs(m % 3 - n % 3) + abs(int(m / 3) - int(n / 3)) == 1: result.append(m)
	return result

func role(f: Dictionary, card: Dictionary) -> String:
	if card.is_empty() or card.has("skillId") or card.get("comboBonus", false): return ""
	var kind = card.get("sourceKind", "")
	var slot = card.get("sourceSlot", "")
	# Old dealt saves have no sourceKind. Resolve canonical equipment without
	# rebuilding/shuffling their deck or treating an intrinsic figure as equipment.
	if kind == "":
		var template = card.get("templateId", card.get("id", "").split("#")[0])
		for reference in f.get("gear", {}).values():
			if not reference: continue
			var item = combat.catalog.item(reference)
			if item.get("unarmed", false): continue
			for definition in item.get("figures", []):
				if template == item.id + ":" + definition.id:
					kind = item.kind
					slot = item.slot
	if kind == "shield" and card.get("blocks", false): return "shieldBlock"
	if card.get("category", "") != "attack": return ""
	if kind == "weapon": return "weaponAttack"
	if slot == "feet": return "footAttack"
	if kind == "shield": return "equipmentAttack"
	return ""

func matches(actual: String, expected: String) -> bool:
	return actual == expected or (expected == "equipmentAttack" and actual in ["weaponAttack", "footAttack", "equipmentAttack"])

func entry(rule: Dictionary, groups: Array, links: Array, affected: Array, bonus: int = -1) -> Dictionary:
	var all_cells: Array = []
	var ids: Array = []
	for group in groups:
		ids.append(group.card.id)
		for n in group.cells:
			if n not in all_cells: all_cells.append(n)
	if bonus >= 0: all_cells.append(bonus)
	return {"id": rule.id, "name": rule.name, "description": rule.description,
		"effect": rule.effect, "condition": rule.condition, "groups": groups,
		"members": ids, "cells": all_cells, "affected": affected, "links": links, "bonus": bonus}

func build(f: Dictionary, placed: Array, mod: Dictionary = {}) -> Dictionary:
	var original = combat.layer(f, placed, mod)
	var expanded = original.duplicate()
	var groups: Array = []
	for p in placed:
		var card = combat.card_by_id(f,p.id)
		var grouped = {}
		for n in combat.cells(card,p,mod):
			if n < 0: continue
			for action in combat.Actions.components(original[n]):
				var tag = role(f,action)
				if tag == "": continue
				# Only cells with this action participate; guard cells on a weapon
				# are not attacks, and one mixed figure cannot pair with itself.
				var key = tag+str(action.get("healthDamage",{}))+str(action.get("staminaDamage",{}))+str(action.get("staminaDamagePerCell",0))
				if not grouped.has(key):
					grouped[key] = {"card":action,"role":tag,"cells":[],"concentration":combat.concentration(action,mod),"canHit":roundi(combat.unrounded_damage(f,action)) > 0 and not combat.parts(f,action).is_empty()}
				var group = grouped[key]
				if n not in group.cells: group.cells.append(n)
				else: group.concentration += combat.concentration(action,mod)
		groups.append_array(grouped.values())
	groups.sort_custom(func(a,b): return a.card.id < b.card.id)
	var found: Array = []
	for rule in rules:
		var selected: Dictionary = {}
		if rule.geometry == "pair":
			for a in groups:
				if not matches(a.role, rule.roles[0]): continue
				for b in groups:
					if a.card.id == b.card.id or not matches(b.role, rule.roles[1]): continue
					var links: Array = []
					var affected: Array = []
					for n in a.cells:
						for m in b.cells:
							if m in neighbors(n):
								links.append([n,m])
								for c in [n,m]:
									if c not in affected: affected.append(c)
					if links.size() >= int(rule.minEdges):
						selected = entry(rule, [a,b], links, affected)
						break
				if not selected.is_empty(): break
		else:
			for n in 9:
				if not expanded[n].is_empty(): continue
				var adjacent: Array = []
				for group in groups:
					if not matches(group.role, rule.roles[0]): continue
					for m in neighbors(n):
						if m in group.cells: adjacent.append({"group": group, "cell": m})
				for a in adjacent:
					for b in adjacent:
						if a.group.card.id == b.group.card.id: continue
						if rule.geometry == "corner":
							if a.cell%3 == b.cell%3 or int(a.cell/3) == int(b.cell/3): continue
							var touches = false
							for c in a.group.cells:
								for d in b.group.cells:
									if d in neighbors(c): touches = true
							if touches: selected = entry(rule,[a.group,b.group],[[a.cell,n],[b.cell,n]],[n],n)
						else:
							for c in adjacent:
								if c.group.card.id not in [a.group.card.id,b.group.card.id]:
									selected = entry(rule,[a.group,b.group,c.group],[[a.cell,n],[b.cell,n],[c.cell,n]],[n],n)
									break
						if not selected.is_empty(): break
					if not selected.is_empty(): break
				if not selected.is_empty(): break
		if selected.is_empty(): continue
		if selected.bonus >= 0:
			var bonus: Dictionary
			if selected.effect.has("bonusBlockCost"):
				bonus = {"name": selected.name, "category": "defense", "blocks": true, "blockCost": selected.effect.bonusBlockCost,
					"shape": [[0,0]], "art": selected.groups[0].card.get("art", "")}
			else:
				var weakest = selected.groups[0]
				var damage = INF
				for group in selected.groups:
					var concentration = group.concentration
					var value = roundf(combat.unrounded_damage(f,group.card)) * concentration
					if value < damage:
						damage = value
						weakest = group
				bonus = weakest.card.duplicate(true)
				bonus.comboConcentration = weakest.concentration
				bonus.name = selected.name
				bonus.shape = [[0,0]]
				bonus.staminaCost = 0
			bonus.id = "combo:" + selected.id
			bonus.comboBonus = true
			expanded[selected.bonus] = bonus
		found.append(selected)
	return {"layer": expanded, "combos": found}

func hits(group: Dictionary, opposing: Array, guard: bool = false) -> bool:
	for n in group.cells:
		if guard:
			if combat.is_strike(opposing[n]): return true
		elif group.canHit and combat.contact(group.card,opposing[n]) > 0: return true
	return false

func active(combo: Dictionary, opposing: Array) -> bool:
	match combo.condition:
		"guardHit": return hits(combo.groups[1],opposing,true)
		"bothHit": return hits(combo.groups[0],opposing) and hits(combo.groups[1],opposing)
		"kickAndGuard": return hits(combo.groups[0],opposing) and hits(combo.groups[1],opposing,true)
	return true

func expenses(f: Dictionary, placed: Array, mod: Dictionary, opposing: Array, context: Dictionary = {}) -> Dictionary:
	if context.is_empty(): context = build(f,placed,mod)
	var attacks = 0.0
	var blocks = 0.0
	var by_cell: Array = []
	for p in placed: attacks += combat.card_by_id(f,p.id).get("staminaCost",0)
	for n in 9:
		var amount = float(context.layer[n].get("blockCost",0)) if opposing.is_empty() or combat.is_strike(opposing[n]) else 0.0
		by_cell.append(amount)
	for combo in context.combos:
		var discount = float(combo.effect.get("blockDiscount",0))
		for n in combo.cells:
			var reduction = minf(by_cell[n],discount)
			by_cell[n] -= reduction
			discount -= reduction
	for value in by_cell: blocks += value
	return {"attacks":attacks,"blocks":blocks,"total":attacks+blocks,"remaining":f.stamina-attacks-blocks,"cells":by_cell}

func cell_combos(context: Dictionary, n: int, opposing: Array, known: bool = true) -> Array:
	var result: Array = []
	for combo in context.combos:
		if n not in combo.cells: continue
		result.append({"id":combo.id,"name":combo.name,"description":combo.description,"links":combo.links,
			"active":active(combo,opposing) if known else combo.condition == "always", "pending":not known and combo.condition != "always"})
	return result
