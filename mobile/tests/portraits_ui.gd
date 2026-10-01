extends "res://scripts/preview_portraits.gd"
const PortraitArt = preload("res://ui/portrait_art.gd")
const RoundPortrait = preload("res://ui/round_portrait.gd")
var checks = 0
var failures: Array = []
var output = ""

func check(ok: bool, text: String):
	checks += 1
	if not ok: failures.append(text); printerr("FAIL: " + text)

func shot(name: String):
	if output and DisplayServer.get_name() != "headless":
		RenderingServer.force_draw(false)
		root.get_texture().get_image().save_png(output.path_join(name + ".png"))

func inspect_portrait(node):
	check(node is PortraitArt and node.texture != null and not node.texture is AtlasTexture, "full source without background or rectangle crop")
	check(node.texture.get_image().get_pixel(0, 0).a < 0.01, "portrait source has real alpha")
	check(node.material.shader == preload("res://shaders/dialogue_portrait.gdshader"), "shared transparent fade shader")

func run():
	if not OS.get_cmdline_user_args().is_empty(): output = OS.get_cmdline_user_args()[0]
	for mode in MODES:
		await open_mode(mode)
		var before = ui.session.game.duplicate(true)
		var rng = ui.session.combat.rng.state
		for pixels in [Vector2i(480,960), Vector2i(1440,800)]:
			root.size = pixels
			await settle()
			match mode:
				"creation": inspect_portrait(ui.creation_view.identity.portrait)
				"hero": inspect_portrait(ui.character_window.pages[0].portrait)
				"enemy-human", "enemy-creature": inspect_portrait(ui.enemy_window.profile.portrait)
				"creature-card": inspect_portrait(ui.inspection_window.cards[0].artwork)
				"dialogue-hero", "dialogue-character", "dialogue-creature": inspect_portrait(ui.story_view.portrait)
				"creatures":
					check(ui.debug_catalog.icons.all(func(icon): return icon is RoundPortrait and icon.texture_normal != null), "every bestiary entry has a clickable round portrait")
					for icon in ui.debug_catalog.icons:
						check(icon.size.x == icon.size.y and icon.material.shader == preload("res://shaders/portrait_mask.gdshader"), "list uses header mask and circular dimensions")
			shot("%s-%dx%d" % [mode, pixels.x, pixels.y])
		check(before == ui.session.game and rng == ui.session.combat.rng.state, "portrait rendering preserves game and RNG: " + mode)
		if mode == "creatures":
			var index = ui.debug_catalog.entries.find(ui.debug_catalog.entries.filter(func(entry): return entry.id == "wolf")[0])
			ui.debug_catalog.icons[index].pressed.emit()
			await settle()
			check(ui.inspection_window.cards[0].entry.reference == "wolf", "round portrait opens the matching creature card")
	var data = ui.data
	for species in data.creatures:
		check(species.portrait.src.begins_with("/creatures/dialogue-portraits/"), "new creature portrait path: " + species.id)
		var texture = data.portrait({"creatureId":species.id})
		check(texture != null and texture == data.image(species.portrait.src) and texture.get_image().get_pixel(0,0).a < 0.01, "all creature sources load with alpha: " + species.id)
	for id in data.story.speakers:
		var binding = data.story.speakers[id]
		if binding.get("portrait", {}).get("kind", "") == "creature":
			check(data.speaker(id, ui.session.game.player).texture == data.portrait({"creatureId":binding.portrait.id}), "dialogue and combat share creature source: " + id)
	ui.hero_id = ""
	print("PORTRAITS_UI: %d checks; %d failures" % [checks, failures.size()])
	quit(0 if failures.is_empty() else 1)
