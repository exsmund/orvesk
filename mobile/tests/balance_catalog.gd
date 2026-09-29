extends "res://game/catalog.gd"
## The simulation never edits item definitions. Reuse production-resolved items
## across AI queries and enemy generation; fighter gear stores only item IDs.
var resolved: Dictionary = {}

func item(reference) -> Dictionary:
	var key = str(reference)
	if not resolved.has(key): resolved[key] = super.item(reference)
	return resolved[key]
