extends SceneTree
var ui
var checks = 0
var failures: Array = []
var output = ""

class MemorySaves extends RefCounted:
	var error = "Тест: не удалось записать героя"
	var fail = false
	var records: Dictionary = {}
	var writes = 0
	func list_heroes(): return []
	func write(id, session, draft):
		if fail: return false
		writes += 1
		records[id] = {"game": session.game.duplicate(true), "rngState": str(session.combat.rng.state), "draft": draft.duplicate(true)}
		return true

class MemoryPreferences extends RefCounted:
	var completed_difficulties: Array = []
	func record_completed(ids):
		for id in ids:
			if id not in completed_difficulties: completed_difficulties.append(id)
		return true
	var last_hero = "previous"
	func write(): return true

func _initialize(): call_deferred("run")

func check(value: bool, message: String):
	checks += 1
	if not value:
		failures.append(message)
		printerr("FAIL: " + message)

func settle():
	for _frame in 8: await process_frame

func shot(name: String):
	if output and DisplayServer.get_name() != "headless":
		RenderingServer.force_draw(false)
		root.get_texture().get_image().save_png(output.path_join(name + ".png"))

func geometry(step: int):
	var view = ui.creation_view
	var bounds = view.panel.get_global_rect().grow(1)
	check(ui.get_global_rect().grow(1).encloses(bounds), "Creation frame fits safe viewport")
	check(not ui.scroll.visible, "Creation never uses page scroll")
	for node in [view.title, view.subtitle, view.action, view.back_button, view.back_divider]:
		check(bounds.encloses(node.get_global_rect()), "Header/footer control stays inside frame: " + str(node))
	check(not view.action.get_global_rect().intersects(view.back_button.get_global_rect()), "Footer actions do not overlap")
	check(view.actions.size.y - view.back_divider.get_rect().end.y >= 31, "Back ornament clears the bottom frame")
	check(view.back_divider.position.y >= view.back_button.get_rect().end.y - 3, "Back ornament stays within the bottom text padding")
	var title_width = view.title.get_theme_font("font").get_string_size(view.title.text, HORIZONTAL_ALIGNMENT_LEFT, -1, view.title.get_theme_font_size("font_size")).x
	check(title_width <= view.title.size.x, "Window title fits on one line")
	var body = view.body.get_global_rect().grow(1)
	if step == 0:
		var page = view.identity
		for node in [page.portrait, page.previous, page.next, page.name_input]:
			check(body.encloses(node.get_global_rect()), "Identity content fits without scrolling")
		check(page.portrait.texture == ui.data.image(ui.data.portraits[ui.create_portrait].src), "Creation uses complete transparent source")
		check(is_equal_approx(page.portrait.size.aspect(), Vector2(page.portrait.texture.get_size()).aspect()), "Portrait keeps original aspect")
	else:
		var page = view.attributes
		for node in [page.points, page.hint, page.health, page.stamina] + page.rows.values():
			check(body.encloses(node.get_global_rect()), "Attributes and resources fit without scrolling")
		check(page.points.get_content_height() <= page.points.size.y, "Remaining points fit on one complete line")
		for row in page.rows.values():
			check(row.minus.size == row.plus.size and is_equal_approx(row.plus.size.x, row.plus.size.y), "Allocation buttons remain square")
			check(not row.caption.get_global_rect().intersects(row.minus.get_global_rect()), "Stat caption does not overlap minus")
			check(not row.value.get_global_rect().intersects(row.plus.get_global_rect()), "Stat value does not overlap plus")

func run():
	root.gui_embed_subwindows = true
	root.size = Vector2i(432, 1008)
	if not OS.get_cmdline_user_args().is_empty(): output = OS.get_cmdline_user_args()[0]
	ui = load("res://scenes/main.tscn").instantiate()
	ui.saves = MemorySaves.new()
	ui.preferences = MemoryPreferences.new()
	root.add_child(ui)
	await settle()
	ui.session.create("Прежний герой", {"strength":2,"agility":2,"vitality":2,"intelligence":1}, ui.data.portraits[0].id)
	ui.hero_id = "previous"
	var old_session = ui.session
	var old_game = ui.session.game.duplicate(true)
	var old_rng = ui.session.combat.rng.state
	ui.show_character()
	await settle()
	var reference_title_size = ui.character_window.title.get_theme_font_size("font_size")
	var reference_bar = ui.character_window.pages[0].health
	var caption_font = reference_bar.label.get_theme_font("font")
	var caption_size = reference_bar.label.get_theme_font_size("font_size")
	var number_font = reference_bar.value_label.get_theme_font("font")
	var number_size = reference_bar.value_label.get_theme_font_size("font_size")
	var icon_size = reference_bar.icon.custom_minimum_size
	var track_height = reference_bar.track.custom_minimum_size.y
	ui.character_window.close()
	await settle()
	ui.start_create()
	await settle()
	var view = ui.creation_view
	var input = view.identity.name_input
	check(view.title.get_theme_font_size("font_size") == reference_title_size, "New hero title matches the Hero window")
	for bar in [view.attributes.health, view.attributes.stamina]:
		check(bar.label.get_theme_font("font") == caption_font and bar.label.get_theme_font_size("font_size") == caption_size, "Creation resource captions match the Hero tab")
		check(bar.value_label.get_theme_font("font") == number_font and bar.value_label.get_theme_font_size("font_size") == number_size, "Creation resource numbers match the Hero tab")
		check(bar.icon.custom_minimum_size == icon_size and bar.track.custom_minimum_size.y == track_height, "Creation resource symbols and tracks match the Hero tab")
	check(view.step == 0 and view.action.disabled, "First step starts with an empty name and disabled Next")
	input.text = "   "
	input.text_changed.emit(input.text)
	view.action.pressed.emit()
	check(view.step == 0 and view.action.disabled, "Whitespace name cannot advance")
	var initial_portrait = ui.create_portrait
	view.identity.previous.pressed.emit()
	check(ui.create_portrait == posmod(initial_portrait - 1, ui.data.portraits.size()), "Portrait carousel wraps backward through catalog")
	view.identity.next.pressed.emit()
	check(ui.create_portrait == initial_portrait, "Portrait carousel wraps forward")
	view.identity.next.pressed.emit()
	var portrait_id = ui.data.portraits[ui.create_portrait].id
	input.text = "Вереск"
	input.text_changed.emit(input.text)
	check(not view.action.disabled and ui.saves.writes == 0, "Name unlocks Next without creating a save")
	for step in 2:
		for pixels in [Vector2i(320,640), Vector2i(432,1008), Vector2i(896,800), Vector2i(1008,432), Vector2i(2240,900), Vector2i(432,1600)]:
			root.size = pixels
			await settle()
			check(ui.creation_view == view and view.identity.name_input == input and ui.create_name == "Вереск" and ui.data.portraits[ui.create_portrait].id == portrait_id, "Resize preserves the draft and input node")
			geometry(step)
			shot("create-step-%d-%dx%d" % [step + 1, pixels.x, pixels.y])
		if step == 0:
			view.action.pressed.emit()
			await settle()
			check(view.step == 1 and view.action.disabled, "Step two requires complete allocation")
	root.size = Vector2i(432,1008)
	await settle()
	var attributes = view.attributes
	for stat in ui.data.STATS:
		check(attributes.rows[stat].minus.disabled and not attributes.rows[stat].plus.disabled, "Initial stats allow only increasing")
	attributes.rows.vitality.plus.pressed.emit()
	check(attributes.health.limit == ui.data.max_hp({"stats": ui.create_stats}), "Health preview uses shared vitality formula")
	check(attributes.rows.vitality.value.text == "2", "Initial allocation shows resulting stat without upgrade arrow")
	attributes.rows.strength.plus.pressed.emit()
	attributes.rows.intelligence.plus.pressed.emit()
	check(ui.session.creation_points_remaining(ui.create_stats) == 0 and not view.action.disabled, "All three points unlock Start")
	for stat in ui.data.STATS: check(attributes.rows[stat].plus.disabled, "Cannot overspend initial points")
	# Hiding the allocation hint must not cross the adaptive column breakpoint.
	for pixels in [Vector2i(766, 962), Vector2i(768, 990), Vector2i(896, 800), Vector2i(432, 1008)]:
		root.size = pixels
		await settle()
		var ready_body = view.body.get_rect()
		var ready_wide = attributes.wide
		var ready_button = view.action.get_global_rect()
		attributes.rows.strength.minus.pressed.emit()
		await settle()
		check(view.actions.hint.visible, "Unspent point shows hint")
		check(view.body.get_rect().is_equal_approx(ready_body), "Hint does not change body geometry")
		check(attributes.wide == ready_wide, "Hint does not switch column layout")
		check(view.action.get_global_rect().is_equal_approx(ready_button), "Hint does not move primary action")
		attributes.rows.strength.plus.pressed.emit()
		await settle()
		check(not view.actions.hint.visible and view.body.get_rect().is_equal_approx(ready_body), "Last point hides hint without reflow")
	var distributed = ui.create_stats.duplicate(true)
	attributes.change("strength", 1)
	attributes.change("agility", -1)
	check(ui.create_stats == distributed, "Invalid allocation cannot exceed budget or reduce below minimum")
	attributes.rows.strength.minus.pressed.emit()
	check(view.action.disabled and ui.session.creation_points_remaining(ui.create_stats) == 1, "Undo returns one point and locks Start")
	attributes.rows.strength.plus.pressed.emit()
	await settle()
	shot("create-step-2-ready")
	ui._notification(Node.NOTIFICATION_WM_GO_BACK_REQUEST)
	await settle()
	check(view.step == 0 and ui.create_stats == distributed and input.text == "Вереск", "Android Back returns to identity without losing choices")
	# Simulate the mobile keyboard and keep the field above its occlusion.
	view.set_keyboard_inset(view.size.y * 0.42)
	await settle()
	check(not view.identity.portrait.visible and input.visible, "Keyboard mode prioritizes name input")
	check(view.panel.get_global_rect().encloses(input.get_global_rect()), "Name stays within reduced keyboard-safe frame")
	check(view.panel.get_rect().end.y <= view.size.y - view.keyboard_inset + 1, "Creation stays above virtual keyboard")
	check(not view.action.get_global_rect().intersects(view.back_button.get_global_rect()), "Keyboard does not squeeze footer buttons together")
	shot("create-keyboard")
	ui._notification(Node.NOTIFICATION_WM_GO_BACK_REQUEST)
	await settle()
	check(view.step == 0 and view.identity.portrait.visible and input.text == "Вереск", "Back first dismisses keyboard without losing name")
	view.action.pressed.emit()
	await settle()
	view.action.pressed.emit()
	await settle()
	check(view.step == 2 and view.title.text == "Сложность" and view.subtitle.text == "Шаг 3 из 3", "Third step chooses difficulty")
	check(ui.create_difficulty == "manageable" and view.difficulty.find_children("*", "CheckBox", true, false).is_empty(), "Default is manageable with story enabled")
	check(view.difficulty.buttons.legendary.disabled, "Legendary initially locked")
	ui.saves.fail = true
	view.action.pressed.emit()
	await settle()
	check(ui.creation_view == view and view.step == 2 and view.warning.text == ui.saves.error, "Failed creation save stays on difficulty with error")
	check(ui.session == old_session and ui.session.game == old_game and ui.session.combat.rng.state == old_rng and ui.hero_id == "previous", "Failed creation leaves existing hero and RNG intact")
	check(ui.preferences.last_hero == "previous" and ui.saves.writes == 0 and ui.create_stats == distributed, "Failed save preserves draft and last hero")
	ui.saves.fail = false
	view.action.pressed.emit()
	view.action.pressed.emit()
	await settle()
	check(ui.saves.writes == 1 and ui.screen == "game" and ui.session.game.phase == "story", "Create saves once and starts real campaign prologue")
	check(ui.session.game.player.name == "Вереск" and ui.session.game.player.portraitId == portrait_id and ui.session.game.player.stats == distributed, "Created hero matches both draft steps")
	check(ui.session.game.souls == 0 and ui.data.level(ui.session.game.player) == 1, "Starting balance and hero level unchanged")
	check(ui.preferences.last_hero == ui.hero_id and ui.hero_id != "previous", "New hero becomes last played only after save")
	var restored = preload("res://game/session.gd").new(ui.data)
	check(restored.restore(ui.saves.records[ui.hero_id]).is_empty() and restored.game == ui.session.game, "Created campaign restores through normal loader")
	ui.start_create()
	await settle()
	check(ui.create_name.is_empty() and ui.create_portrait >= 0 and ui.create_portrait < ui.data.portraits.size() and ui.session.creation_points_remaining(ui.create_stats) == ui.session.CREATION_POINTS, "New creation starts a clean draft with a valid random portrait")
	ui.creation_view.back_button.pressed.emit()
	await settle()
	check(ui.screen == "home" and ui.saves.writes == 1, "Cancel first step returns home without creating another hero")
	ui.hero_id = ""
	print("CREATION_UI: %s (%d checks; %d failures)" % ["PASS" if failures.is_empty() else "FAIL", checks, failures.size()])
	quit(0 if failures.is_empty() else 1)
