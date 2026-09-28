extends SceneTree
## Current catalog artwork must also render on immutable cards from old saves.
const Catalog = preload("res://game/catalog.gd")
const Combat = preload("res://game/combat.gd")
const FigureArt = preload("res://ui/figure_art.gd")
var checks = 0
var failures: Array = []

func _initialize():
	var data = Catalog.new()
	var art = FigureArt.new(data, Combat.new(data))
	var retired_hero = {"portraitId": "character-01-ash"}
	var before_hero = retired_hero.duplicate(true)
	var default_portrait = data.image(data.portraits[0].src)
	check(default_portrait != null, "Current default portrait exists")
	check(data.portrait(retired_hero) == default_portrait, "Retired portrait uses current catalog fallback")
	check(retired_hero == before_hero, "Portrait fallback preserves saved hero")
	for figure in data.base:
		if figure.get("art", ""): saved_card(art, {"id": "base:" + figure.id + "#2"}, figure.art)
	for species in data.creatures:
		for definitions in [species.figures] + species.get("variants", {}).values().map(func(v): return v.figures):
			for figure in definitions:
				if figure.get("art", ""): saved_card(art, {"id": "base:" + figure.id + "#1"}, figure.art)
	for item in data.items:
		for figure in item.get("figures", []):
			var expected: String = figure.get("art", data.art.get(item.id, ""))
			if expected.is_empty(): continue
			# Mobile snapshots have neither weaponId nor equipmentId.
			var key = item.id + "@3:" + figure.id
			saved_card(art, {"id": key + "#2", "templateId": key}, expected)
			saved_card(art, {"id": key + "#1"}, expected)
	for skill in data.skills:
		if skill.has("figure"):
			saved_card(art, {"id": skill.figure.id + "#1", "skillId": skill.id}, skill.figure.get("art", skill.art))
		check(data.image(skill.art) != null, "Skill inventory texture: " + skill.id)
	for path in data.art.values():
		check(data.image(path) != null, "Equipment inventory texture: " + path)
	var fallback = {"id": "external-figure", "art": data.base[0].art}
	check(art.texture_for(fallback) == data.image(fallback.art), "Unknown figure retains its own artwork")
	print("SHARED_ART: %s (%d checks; %d failures)" % ["PASS" if failures.is_empty() else "FAIL", checks, failures.size()])
	quit(0 if failures.is_empty() else 1)

func saved_card(art, identity: Dictionary, path: String):
	var card = identity.duplicate(true)
	card.art = "/old-art-no-longer-exists.png"
	card.staminaCost = 17
	card.shape = [[0, 0], [1, 0]]
	var before = card.duplicate(true)
	var texture = art.texture_for(card)
	check(texture != null and texture.resource_path == "res://content/generated/art" + path, "Saved card resolves current art: " + card.id)
	check(card == before, "Rendering preserves saved card: " + card.id)

func check(ok: bool, message: String):
	checks += 1
	if not ok:
		failures.append(message)
		printerr("FAIL: " + message)
