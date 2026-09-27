extends SceneTree
var ui
var checks = 0
var failures: Array = []
var output = ""

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

func snapshot(name: String):
	await frame()
	if not output.is_empty() and DisplayServer.get_name() != "headless":
		await RenderingServer.frame_post_draw
		root.get_texture().get_image().save_png(output.path_join(name + ".png"))

func run():
	root.gui_embed_subwindows = true
	if not OS.get_cmdline_user_args().is_empty(): output = OS.get_cmdline_user_args()[0]
	ui = load("res://scenes/main.tscn").instantiate()
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
	var dialogs = ui.get_children().filter(func(c): return c is AcceptDialog and c.visible)
	check(dialogs.size() == 1, "Long press opens figure description")
	check(ui.rotation_for(id) == 0 and ui.draft.is_empty(), "Long press neither rotates nor places")
	await snapshot("combat-description")
	touch(center, false)
	if not dialogs.is_empty():
		check(dialogs[0].dialog_text.contains("Урон здоровью за клетку: 3"), "Description uses actual dealt card damage")
		ui._notification(Control.NOTIFICATION_WM_GO_BACK_REQUEST)
	await frame()
	check(ui.screen == "game" and ui.get_children().filter(func(c): return c is AcceptDialog and c.visible).is_empty(), "Android Back closes only the description, keeping the battle")
	# Drag a two-cell figure. The ghost uses actual board cell dimensions.
	touch(center, true)
	motion(center + Vector2(20, -20))
	var target = ui.board.global_position + screen.drag_offset + Vector2(2, 2)
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
	# Canceling outside the field keeps the old placement, including on app interruption.
	var board_point = ui.board.get_global_rect().position + Vector2.ONE * (ui.board.size.x / 6)
	touch(board_point, true)
	motion(board_point + Vector2(20, 20))
	check(screen.drag_id == id, "Can drag a previously placed figure")
	motion(Vector2(-100, -100))
	touch(Vector2(-100, -100), false, 0, true)
	check(ui.draft == saved_draft and screen.drag_id.is_empty(), "Canceled board drag preserves placement")
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
	center = screen.cards[0].get_global_rect().get_center()
	touch(center, true)
	motion(center + Vector2(20, -20))
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
	ui.place_selected(0)
	check(JSON.stringify(ui.session.game) == reveal and ui.draft.is_empty(), "Reveal cannot be rotated or edited")
	await snapshot("combat-reveal")
	check(ui.combat_view.action.text == "Рассчитать ход", "Bottom action switches to resolve")
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
