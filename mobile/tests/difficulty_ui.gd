extends SceneTree
const Modal = preload("res://ui/modal_dialog.gd")
const Session = preload("res://game/session.gd")
var ui
var checks = 0
var failures: Array = []
var output = ""

class MemorySaves extends RefCounted:
	var error = "Тестовая ошибка записи"
	var fail = false
	var records: Dictionary = {}
	func write(id, session, draft):
		if fail: return false
		records[id] = {"game":session.game.duplicate(true),"rngState":str(session.combat.rng.state),"draft":draft.duplicate(true)}
		return true
	func read(id): return records.get(id, {}).duplicate(true)
	func list_heroes(): return records.keys().map(func(id):return {"id":id,"payload":records[id].duplicate(true)})

func _initialize(): call_deferred("run")
func check(ok: bool, label: String):
	checks += 1
	if not ok: failures.append(label); printerr("FAIL: " + label)
func settle():
	for _i in 8: await process_frame
func dialog():
	for node in ui.get_children():
		if node is Modal and node.visible: return node
	return null
func shot(name: String):
	if output and DisplayServer.get_name() != "headless":
		RenderingServer.force_draw(false)
		root.get_texture().get_image().save_png(output.path_join(name + ".png"))
func run():
	if not OS.get_cmdline_user_args().is_empty(): output = OS.get_cmdline_user_args()[0]
	ui = load("res://scenes/main.tscn").instantiate()
	ui.saves = MemorySaves.new()
	ui.preferences = preload("res://game/preferences.gd").new("/tmp/orvesk-difficulty-ui-" + str(Time.get_ticks_usec()) + ".cfg")
	root.add_child(ui)
	await settle()
	ui.start_create()
	ui.create_name = "Искатель"
	ui.create_stats.strength += 3
	var view = ui.creation_view
	view.refresh()
	view.advance()
	view.advance()
	await settle()
	check(view.step == 2 and not view.action.disabled and view.difficulty.buttons.legendary.disabled, "third step and locked legendary")
	check(view.difficulty.find_children("*", "CheckBox", true, false).is_empty(), "new hero has no skip-story checkbox")
	for pixels in [Vector2i(360,800),Vector2i(480,960),Vector2i(1008,432),Vector2i(1600,700)]:
		root.size = pixels
		await settle()
		var panel_rect = view.panel.get_global_rect()
		var primary_rect = view.action.get_global_rect()
		var back_rect = view.back_button.get_global_rect()
		var ornament_rect = view.back_divider.get_global_rect()
		var font_size = view.action.get_theme_font_size("font_size")
		check(view.difficulty.page.get_global_rect().get_center().distance_to(view.body.get_global_rect().get_center()) < 1, "difficulty group centered vertically and horizontally")
		for earlier in [0, 1]:
			view.step = earlier
			view.refresh()
			await settle()
			check(view.panel.get_global_rect().is_equal_approx(panel_rect), "all creation steps share window bounds " + str(pixels))
			check(view.action.get_global_rect().is_equal_approx(primary_rect) and view.back_button.get_global_rect().is_equal_approx(back_rect) and view.back_divider.get_global_rect().is_equal_approx(ornament_rect), "all creation steps share footer geometry")
			check(view.action.material == null and view.action.get_theme_font_size("font_size") == font_size, "all creation steps share button material and typography")
		view.step = 2
		view.refresh()
		await settle()
		for button in view.difficulty.buttons.values():
			check(view.body.get_global_rect().grow(1).encloses(button.get_global_rect()), "difficulty controls fit " + str(pixels))
		shot("difficulty-%dx%d" % [pixels.x,pixels.y])
	view.difficulty.buttons.burdensome.pressed.emit()
	view.back()
	view.advance()
	check(ui.create_difficulty == "burdensome", "back keeps difficulty draft")
	view.advance()
	await settle()
	check(ui.session.game.difficulty == "burdensome" and not ui.session.game.skipStory and ui.session.combat.enemy_damage_multiplier == 1.0, "creation saves selected options")
	check(ui.session.game.phase == "story" and ui.session.campaign.node().kind != "choice", "first hero starts with prologue")
	var ending = ui.data.story.nodes.values().filter(func(node):return node.kind == "end")[0]
	check(ui.act(func():return ui.session.campaign.seek(ending.id,true)), "finish campaign through saved action")
	await settle()
	var popup = dialog()
	check(popup != null and popup.checkbox.visible and not popup.checkbox.button_pressed, "completion offers replay with unchecked checkbox")
	check(ui.data.difficulty_available("legendary", ui.preferences.completed_difficulties), "saved hard completion unlocks legendary")
	root.size = Vector2i(480,960)
	await settle()
	shot("replay-dialog")
	var finished = ui.session.game.duplicate(true)
	var finished_rng = ui.session.combat.rng.state
	popup.secondary.pressed.emit()
	await settle()
	check(ui.screen == "heroes" and ui.session.game == finished, "declining keeps completed save")
	ui.load_hero(ui.hero_id)
	await settle()
	popup = dialog()
	check(popup != null and not popup.checkbox.button_pressed, "selecting completed hero offers replay again")
	ui.saves.fail = true
	popup.checkbox.button_pressed = true
	popup.primary.pressed.emit()
	await settle()
	check(ui.session.game == finished and ui.session.combat.enemy_damage_multiplier == 1.0 and ui.session.combat.rng.state == finished_rng and popup.visible, "failed replay save restores state, RNG coefficient and dialog")
	ui.saves.fail = false
	popup.primary.pressed.emit()
	await settle()
	check(ui.session.game.playthrough == 2 and ui.session.game.difficulty == "legendary" and ui.session.game.skipStory, "accept restarts on legendary with selected story option")
	check(ui.session.game.journey.expedition == 1 and dialog() == null, "new journey replaces ended screen")
	var saved_id = ui.hero_id
	ui.show_home()
	ui.start_create()
	check(not ui.creation_view.difficulty.buttons.legendary.disabled, "legendary unlocked for other new heroes")
	check(ui.creation_view.difficulty.find_children("*", "CheckBox", true, false).is_empty(), "story cannot be skipped for another new hero either")
	ui.creation_view.difficulty.buttons.legendary.pressed.emit()
	ui.saves.records.erase(saved_id)
	check(ui.data.difficulty_available("legendary", ui.completed_difficulties()), "achievement survives removal of completed save")
	ui.hero_id = ""
	print("DIFFICULTY_UI: %d checks; %d failures" % [checks,failures.size()])
	quit(0 if failures.is_empty() else 1)
