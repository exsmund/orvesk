extends SceneTree
const ModalDialog = preload("res://ui/modal_dialog.gd")
var ui
var checks = 0
var failures: Array = []
var output = ""
class UnavailableSaves extends RefCounted:
	var error = "Сохранение недоступно"
	func write(_id, _session, _draft): return false

func _initialize(): call_deferred("run")

func check(condition: bool, description: String):
	checks += 1
	if not condition:
		failures.append(description)
		printerr("FAIL: " + description)

func frame():
	await process_frame
	await process_frame

func touch(point: Vector2, pressed: bool, index: int = 0, canceled: bool = false):
	var event = InputEventScreenTouch.new()
	event.position = point
	event.pressed = pressed
	event.index = index
	event.canceled = canceled
	root.push_input(event, true)

func motion(point: Vector2, index: int = 0):
	var event = InputEventScreenDrag.new()
	event.position = point
	event.index = index
	root.push_input(event, true)

func cell_center(index: int) -> Vector2:
	return ui.board.global_position + ui.board.cell_rect(index).get_center()

func close_report():
	ui._notification(Control.NOTIFICATION_WM_GO_BACK_REQUEST)
	await frame()

func snapshot(name: String):
	await frame()
	if not output.is_empty() and DisplayServer.get_name() != "headless":
		await RenderingServer.frame_post_draw
		root.get_texture().get_image().save_png(output.path_join(name + ".png"))

func run():
	root.gui_embed_subwindows = true
	if not OS.get_cmdline_user_args().is_empty(): output = OS.get_cmdline_user_args()[0]
	ui = load("res://scenes/main.tscn").instantiate()
	ui.session = preload("res://tests/campaign_driver.gd").new(ui.data)
	root.add_child(ui)
	await frame()
	root.size = Vector2i(432, 1008)
	ui.session.combat.rng.seed = 43
	ui.session.create("Вереск", {"strength": 1, "agility": 1, "vitality": 1, "intelligence": 4}, ui.data.portraits[0].id)
	ui.session.travel("fight-1")
	var all_cards = ui.session.combat.build_deck(ui.session.game.player)
	ui.session.game.player.deck.hand = [all_cards[3], all_cards[8], all_cards[5], all_cards[0]]
	ui.show_game()
	await frame()
	var screen = ui.combat_view
	var id = screen.cards[0].card_id
	var center = screen.cards[0].get_global_rect().get_center()
	var state = JSON.stringify(ui.session.game)
	var rng = ui.session.combat.rng.state
	check(screen.cards.size() == 4 and not ui.scroll.visible, "Four native figures; no scroll container")
	# Every cell uses the same hold gesture as the hand; a tap does nothing.
	ui.selected = id
	for index in 9:
		var point = cell_center(index)
		touch(point, true)
		touch(point, false)
		await frame()
		check(not ui.get_children().any(func(c): return c is ModalDialog and c.visible), "Tap does not inspect cell %d" % (index + 1))
		touch(point, true)
		ui.board._process(0.51)
		touch(point, false)
		await frame()
		var reports = ui.get_children().filter(func(c): return c is ModalDialog and c.visible)
		check(reports.size() == 1 and reports[0].title.begins_with("Клетка %d ·" % (index + 1)), "Hold inspects cell %d" % (index + 1))
		check(ui.draft.is_empty() and JSON.stringify(ui.session.game) == state and ui.session.combat.rng.state == rng, "Cell inspection does not place a selected figure or mutate combat")
		await close_report()
	var previous_x = -1.0
	for child in [screen.header.player_portrait, screen.header.player_bars, screen.header.mode_icon, screen.header.enemy_bars, screen.header.enemy_portrait]:
		check(child.position.x > previous_x, "Header order")
		previous_x = child.position.x
	for count in range(1, 5):
		touch(center, true)
		touch(center, false)
		await frame()
		check(ui.rotation_for(id) == count % 4, "Single tap rotates exactly once, cycle %d" % count)
	check(JSON.stringify(ui.session.game) == state and ui.session.combat.rng.state == rng, "Rotation changes no game state or RNG")
	for pressed in [true, false]:
		var mouse = InputEventMouseButton.new()
		mouse.position = center
		mouse.button_index = MOUSE_BUTTON_LEFT
		mouse.pressed = pressed
		root.push_input(mouse, true)
	check(ui.rotation_for(id) == 1, "Desktop/emulator mouse tap rotates exactly once")
	for pressed in [true, false]:
		var emulated = InputEventMouseButton.new()
		emulated.device = -1
		emulated.position = center
		emulated.button_index = MOUSE_BUTTON_LEFT
		emulated.pressed = pressed
		root.push_input(emulated, true)
	check(ui.rotation_for(id) == 1, "Emulated duplicate mouse input is ignored")
	ui.rotate_card(id)
	ui.rotate_card(id)
	ui.rotate_card(id)
	# The same real touch stream handles long press, without a follow-up rotation.
	touch(center, true)
	await create_timer(0.6).timeout
	var dialogs = ui.get_children().filter(func(c): return c is ModalDialog and c.visible)
	check(dialogs.size() == 1, "Long press opens figure description")
	check(ui.rotation_for(id) == 0 and ui.draft.is_empty(), "Long press neither rotates nor places")
	await snapshot("combat-description")
	touch(center, false)
	if not dialogs.is_empty():
		check(dialogs[0].dialog_text.contains("Урон здоровью за клетку: 3"), "Description uses actual dealt card damage")
		ui._notification(Control.NOTIFICATION_WM_GO_BACK_REQUEST)
	await frame()
	check(ui.screen == "game" and ui.get_children().filter(func(c): return c is ModalDialog and c.visible).is_empty(), "Android Back closes only the description, keeping the battle")
	# Aim with the bottom center of the whole silhouette, not the first cell.
	var pitch = ui.board.size.x / 3
	for orientation in 4:
		if orientation > 0: ui.rotate_card(id)
		touch(center, true)
		motion(center + Vector2(20, -20))
		var finger = ui.board.global_position + (Vector2(pitch - 1.5, pitch - 3) if orientation % 2 == 0 else Vector2(pitch / 2 - 1.5, pitch * 2 - 3))
		motion(finger)
		var footprint = ui.board.preview.duplicate()
		footprint.sort()
		check(screen.drop_valid and footprint == ([0, 1] if orientation % 2 == 0 else [0, 3]), "Bottom-center targeting follows rotation %d" % orientation)
		touch(finger, false, 0, true)
	ui.rotate_card(id)
	ui.session.game.clashPlan.playerModifiers.compressed = id
	touch(center, true)
	motion(center + Vector2(20,-20))
	var compressed_target = ui.board.global_position + Vector2(pitch / 2 - 1.5, pitch - 3)
	motion(compressed_target)
	check(screen.drop_valid and ui.board.preview == [0], "Compressed figure is anchored by its one-cell silhouette")
	touch(compressed_target, false, 0, true)
	ui.session.game.clashPlan.playerModifiers.erase("compressed")
	screen.refresh()
	# Drag a two-cell figure. The ghost uses actual board cell dimensions.
	touch(center, true)
	motion(center + Vector2(20, -20))
	var target = ui.board.global_position + Vector2(pitch - 1.5, pitch - 3)
	motion(target)
	check(screen.drag_id == id and screen.drop_valid and ui.board.preview == [0, 1], "Touch drag previews precise two-cell footprint")
	check(ui.draft.is_empty(), "Preview does not commit or save placement")
	check(screen.board.size.x / 3 > screen.cards[0].size.x / 2, "Dragged figure uses larger board cells")
	await snapshot("combat-drag")
	# An unrelated finger cannot finish or move the active gesture.
	touch(target, false, 1)
	check(screen.drag_id == id, "Second finger cannot release active drag")
	touch(target, false)
	check(ui.draft.size() == 1 and ui.draft[0].x == 0 and ui.draft[0].y == 0, "Drop commits exact preview position")
	for grabbed_cell in [0,1]:
		touch(cell_center(grabbed_cell), true)
		for target_row in [1,2]:
			var finger = ui.board.global_position + Vector2(pitch - 1.5, pitch * (target_row + 1) - 3)
			motion(finger)
			check(screen.drop_valid and ui.board.preview == [target_row * 3, target_row * 3 + 1], "Regrab cell %d uses bottom center in row %d, including board bottom" % [grabbed_cell, target_row])
		touch(screen.drag_point, false, 0, true)
	var before_inspection = ui.draft.duplicate(true)
	var inspected_point = cell_center(1)
	for pressed in [true, false]:
		var click = InputEventMouseButton.new()
		click.button_index = MOUSE_BUTTON_LEFT
		click.position = inspected_point
		click.pressed = pressed
		root.push_input(click, true)
		if pressed: ui.board._process(0.51)
	await frame()
	var cell_reports = ui.get_children().filter(func(c): return c is ModalDialog and c.visible)
	check(cell_reports.size() == 1 and cell_reports[0].title.begins_with("Клетка 2 ·"), "Mouse hold on any part of placed figure opens that cell report")
	check(ui.draft == before_inspection and ui.rotation_for(id) == 0, "Inspecting own figure neither removes nor rotates it")
	await close_report()
	await snapshot("combat-cover")
	# Reject overlap and out-of-bounds drops without altering the existing draft.
	var other = screen.cards[1]
	var other_center = other.get_global_rect().get_center()
	var saved_draft = ui.draft.duplicate(true)
	touch(other_center, true)
	motion(other_center + Vector2(20, -20))
	motion(ui.board.global_position + screen.drag_offset + Vector2(2, 2))
	check(not screen.drop_valid, "Overlap is visibly invalid")
	touch(screen.drag_point, false)
	check(ui.draft == saved_draft, "Invalid overlap preserves original draft")
	touch(other_center, true)
	motion(other_center + Vector2(20, -20))
	motion(ui.board.global_position + Vector2(ui.board.size.x * 2 / 3, 0) + screen.drag_offset + Vector2(2, 2))
	check(not screen.drop_valid, "Out-of-bounds shape is visibly invalid")
	touch(screen.drag_point, false)
	check(ui.draft == saved_draft, "Out-of-bounds drop does not commit")
	touch(other_center, true)
	motion(Vector2(-100, -100))
	touch(Vector2(-100, -100), false)
	check(ui.draft == saved_draft, "Discarding a drag from hand outside the board changes no placement")
	# Canceling outside the field keeps the old placement, including on app interruption.
	var board_point = ui.board.get_global_rect().position + Vector2.ONE * (ui.board.size.x / 6)
	touch(board_point, true)
	motion(board_point + Vector2(20, 20))
	check(screen.drag_id == id, "Can drag a previously placed figure")
	motion(Vector2(-100, -100))
	touch(Vector2(-100, -100), false, 0, true)
	check(ui.draft == saved_draft and screen.drag_id.is_empty(), "Canceled board drag preserves placement")
	touch(board_point, true)
	motion(board_point + Vector2(20, 20))
	var invalid_inside = ui.board.global_position + Vector2(pitch * 2.75, pitch - 3)
	motion(invalid_inside)
	check(ui.board.get_global_rect().has_point(invalid_inside) and not screen.drop_valid, "Pointer inside can still have an invalid multi-cell footprint")
	touch(invalid_inside, false)
	check(ui.draft == saved_draft, "Invalid inside drop restores placed figure instead of deleting it")
	# Move the existing figure to a new legal row.
	touch(board_point, true)
	motion(board_point + Vector2(20, 20))
	motion(ui.board.global_position + Vector2(0, ui.board.size.y / 3) + screen.drag_offset + Vector2(2, 2))
	check(screen.drop_valid and ui.board.preview == [3, 4], "Placed figure previews relocation without self-collision")
	touch(screen.drag_point, false)
	check(ui.draft.size() == 1 and ui.draft[0].y == 1, "Placed figure moved, not duplicated")
	var placement = ui.draft.duplicate(true)
	ui.hero_id = "combat-test-" + Crypto.new().generate_random_bytes(8).hex_encode()
	check(ui.persist(), "Save native gesture placement")
	var restored = ui.saves.read(ui.hero_id)
	check(restored.draft.size() == 1 and restored.draft[0].id == id and restored.draft[0].y == 1, "Saved draft includes exact placement and rotation")
	# Exiting the field previews removal but does not commit before release.
	board_point = cell_center(4)
	var outside = ui.board.get_global_rect().end + Vector2(4, 4)
	touch(board_point, true)
	motion(outside)
	check(screen.drag_id == id and ui.draft == placement and not screen.drop_valid, "Dragging any occupied part outside only previews removal")
	check(screen.forecast.cost.remaining == ui.session.game.player.stamina, "Removal preview releases reserved stamina")
	# A second pointer dragging a different hand card must not steal or finish this gesture.
	var hand_point = screen.cards[1].get_global_rect().get_center()
	touch(hand_point, true, 1)
	motion(hand_point + Vector2(20, 20), 1)
	touch(hand_point + Vector2(20, 20), false, 1)
	check(screen.drag_id == id and screen.drag_source == ui.board and ui.draft == placement, "Other pointer cannot steal removal gesture")
	# The release point, not an offset ghost anchor, decides whether it is outside.
	var returned = ui.board.global_position + Vector2(0, ui.board.size.y / 3) + screen.drag_offset + Vector2(2, 2)
	motion(returned)
	check(screen.drop_valid, "Returning to board cancels removal preview")
	touch(returned, false)
	check(ui.draft == placement, "Returning before release retains the placed figure")
	# A rejected save restores placement and all visual resources.
	var real_saves = ui.saves
	ui.saves = UnavailableSaves.new()
	touch(cell_center(4), true)
	motion(outside)
	touch(outside, false)
	check(ui.draft == placement and not screen.cards[0].visible and not ui.board.player_layer[4].is_empty(), "Failed removal save keeps figure on board")
	check(screen.forecast == ui.session.combat.forecast(ui.session.game, placement), "Failed removal restores original forecast")
	ui.saves = real_saves
	touch(cell_center(4), true)
	motion(outside)
	touch(outside, false)
	check(ui.draft.is_empty() and ui.board.player_layer.all(func(c): return c.is_empty()) and screen.cards[0].visible, "Outside release removes entire figure and returns it to hand")
	check(ui.saves.read(ui.hero_id).draft.is_empty(), "Removal is persisted")
	check(screen.header.bars[1].displayed_value == ui.session.game.player.stamina and screen.action.text == "Подтвердить ход", "Removal refreshes resource forecast and action")
	check(JSON.stringify(ui.session.game) == state and ui.session.combat.rng.state == rng, "Inspection and relocation/removal preserve deck, combat and RNG")
	ui.load_hero(ui.hero_id)
	screen = ui.combat_view
	await frame()
	check(ui.draft.is_empty() and screen.cards[0].visible, "Removal survives saved game reload")
	ui.place_card(id, 3, 0)
	placement = ui.draft.duplicate(true)
	# Unfold while removing a placed figure: cancellation must preserve its draft.
	center = cell_center(4)
	touch(center, true)
	motion(center + Vector2(20, -20))
	motion(ui.board.get_global_rect().end + Vector2(4, 4))
	root.size = Vector2i(896, 800)
	await frame()
	check(ui.combat_view == screen and screen.columns == 2 and ui.draft == placement, "Unfold keeps screen, gesture state and draft")
	check(screen.drag_id.is_empty() and ui.board.preview.is_empty(), "Resize cancels only uncommitted drag preview")
	await snapshot("combat-inner")
	root.size = Vector2i(432, 1008)
	await frame()
	check(ui.combat_view == screen and screen.columns == 1, "Fold back switches hand below board")
	# Reveal is read-only; the same bottom action completes the turn.
	ui.session.game.clashPlan.preparer = "player"
	screen.action.pressed.emit()
	await frame()
	check(ui.session.game.clashPlan.stage == "reveal", "Bottom action commits reveal")
	var reveal = JSON.stringify(ui.session.game)
	ui.rotate_card(id)
	ui.remove_card(id)
	check(JSON.stringify(ui.session.game) == reveal and ui.draft.is_empty(), "Reveal cannot be rotated or edited")
	var revealed_point = cell_center(3)
	touch(revealed_point, true)
	ui.board._process(0.51)
	touch(revealed_point, false)
	await frame()
	check(ui.get_children().any(func(c): return c is ModalDialog and c.visible and c.title.begins_with("Клетка 4 ·")), "Revealed cells remain inspectable")
	await close_report()
	touch(cell_center(3), true)
	motion(Vector2(-100,-100))
	touch(Vector2(-100,-100), false)
	check(JSON.stringify(ui.session.game) == reveal and ui.combat_view.drag_id.is_empty(), "Dragging cannot remove a committed reveal figure")
	await snapshot("combat-reveal")
	check(ui.combat_view.action.text == "Следующий ход", "First-player reveal offers the next turn")
	ui.combat_view.action.pressed.emit()
	await frame()
	check(ui.session.game.round == 2, "Bottom action resolves turn")
	ui.session.game.player.stamina = 0
	ui.draft = []
	var attack = ui.session.game.player.deck.hand.filter(func(c): return c.get("staminaCost", 0) > 0)[0]
	ui.place_card(attack.id, 0, 0)
	check(ui.combat_view.action.disabled, "Insufficient stamina disables the bottom action")
	for suffix in ["", ".bak", ".tmp"]:
		if FileAccess.file_exists(ui.saves.path(ui.hero_id) + suffix): DirAccess.remove_absolute(ui.saves.path(ui.hero_id) + suffix)
	ui.hero_id = ""
	print("COMBAT_UI: %s (%d checks; %d failures)" % ["PASS" if failures.is_empty() else "FAIL", checks, failures.size()])
	quit(0 if failures.is_empty() else 1)
