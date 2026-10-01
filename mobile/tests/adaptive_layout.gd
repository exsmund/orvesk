extends SceneTree
const Layout = preload("res://ui/adaptive_layout.gd")
var ui
var failures: Array = []
var output = ""

func _initialize():
	call_deferred("run")

func check(condition: bool, description: String):
	if not condition:
		failures.append(description)
		printerr("FAIL: " + description)

func resize_to(pixels: Vector2i, name: String, expected_columns: int = 0):
	root.size = pixels
	for _frame in 8: await process_frame
	var logical = root.get_visible_rect().size
	var transform = root.get_final_transform()
	var origin = transform * Vector2.ZERO
	var end = transform * logical
	check(origin.length() < 1.5 and (end - Vector2(root.size)).length() < 2.0, "%s: entire window used (%s → %s, size %s)" % [name, origin, end, root.size])
	check((ui.size - logical).length() < 1.5, name + ": root follows viewport")
	check((ui.backdrop.size - logical).length() < 1.5, name + ": background covers viewport")
	if ui.scroll.visible: check(ui.content.size.x <= ui.scroll.size.x + 1, name + ": no horizontal clipping")
	if expected_columns:
		check(ui.combat_view.columns == expected_columns, name + ": expected responsive columns")
		check(absf(ui.board.size.x - ui.board.size.y) < 1.0, name + ": board remains square")
		var left = ui.board.get_global_rect()
		var right = ui.combat_view.hand.get_global_rect()
		if expected_columns == 2:
			check(right.position.x >= left.end.x, name + ": hand beside board")
			check(ui.board.get_global_rect().end.y <= ui.combat_view.get_global_rect().end.y + 1, name + ": whole board visible on wide screen")
		else:
			check(right.position.y >= left.end.y, name + ": hand below board")
		check(not ui.scroll.visible, name + ": combat does not use a scroll container")
		var bounds = ui.combat_view.get_global_rect().grow(1)
		for control in [ui.combat_view.header, ui.board, ui.combat_view.hand, ui.combat_view.hint, ui.combat_view.status, ui.combat_view.action]:
			check(bounds.encloses(control.get_global_rect()), name + ": all combat controls fit")
		var visible_cards = ui.combat_view.cards.filter(func(card): return card.visible)
		for i in visible_cards.size():
			var card = visible_cards[i]
			if expected_columns == 1:
				check(absf(card.position.y) < 1, name + ": portrait figures in one row")
			else:
				check(is_equal_approx(card.position.y, int(ui.combat_view.hand_slots[card.card_id] / 2) * card.size.y), name + ": wide figures in two rows")
		for cell in 9:
			var center = (Vector2(cell % 3, cell / 3) + Vector2(0.5, 0.5)) * ui.board.size / 3
			check(ui.board.index_at(center) == cell, name + ": cell hit testing %d" % cell)
	if not output.is_empty() and DisplayServer.get_name() != "headless":
		await RenderingServer.frame_post_draw
		root.get_texture().get_image().save_png(output.path_join(name + ".png"))

func run():
	var args = OS.get_cmdline_user_args()
	if not args.is_empty(): output = args[0]
	check(ProjectSettings.get_setting("display/window/stretch/aspect") == "expand", "Project fills arbitrary aspect ratios")
	check(ProjectSettings.get_setting("display/window/handheld/orientation") == DisplayServer.SCREEN_SENSOR, "Android orientation is not locked")
	check(Layout.safe_margins(Vector2(480, 800), Rect2(0, 0, 1080, 1800), Rect2(0, 90, 1080, 1620)) == {"left": 18, "right": 18, "top": 48, "bottom": 48}, "Portrait top/bottom safe insets scale to logical coordinates")
	check(Layout.safe_margins(Vector2(800, 480), Rect2(0, 0, 1800, 1080), Rect2(90, 0, 1620, 1080)) == {"left": 48, "right": 48, "top": 18, "bottom": 18}, "Landscape side cutouts are respected")
	check(Layout.safe_margins(Vector2(480, 800), Rect2(300, 0, 1080, 1800), Rect2(0, 0, 2400, 1800)) == {"left": 18, "right": 18, "top": 18, "bottom": 18}, "Window-local insets in multiwindow")
	ui = load("res://scenes/main.tscn").instantiate()
	ui.session = preload("res://tests/campaign_driver.gd").new(ui.data)
	root.add_child(ui)
	await process_frame
	ui.show_create()
	var name_input = ui.creation_view.identity.name_input
	name_input.text = "Имя при раскрытии"
	name_input.text_changed.emit(name_input.text)
	ui.create_stats.strength = 3
	ui.create_portrait = 2
	await resize_to(Vector2i(432, 1008), "cover-create")
	await resize_to(Vector2i(896, 800), "inner-create")
	check(is_instance_valid(name_input) and name_input.text == "Имя при раскрытии", "Name input survives folding in place")
	check(ui.create_stats.strength == 3 and ui.create_portrait == 2, "Creation choices survive folding")
	ui.session.combat.rng.seed = 321
	ui.session.create("Fold test", {"strength": 2, "agility": 1, "vitality": 3, "intelligence": 1}, ui.data.portraits[0].id)
	ui.session.travel("fight-1")
	ui.show_game()
	var card = ui.session.game.player.deck.hand[0]
	ui.selected = card.id
	ui.card_rotation = 1
	ui.place_card(card.id, 0, ui.card_rotation)
	check(ui.draft.size() == 1, "Draft placed before resizing")
	var board_before = ui.board
	var state = JSON.stringify(ui.session.game)
	var rng_state = ui.session.combat.rng.state
	var draft = ui.draft.duplicate(true)
	for spec in [
		[Vector2i(432, 1008), "cover-combat", 1],
		[Vector2i(810, 1280), "reported-aspect", 1],
		[Vector2i(896, 800), "inner-combat", 2],
		[Vector2i(800, 896), "inner-rotated", 2],
		[Vector2i(1008, 432), "landscape-combat", 2],
		[Vector2i(2240, 900), "ultrawide-combat", 2],
		[Vector2i(320, 640), "small-window", 1],
		[Vector2i(432, 1008), "refolded-combat", 1]
	]:
		await resize_to(spec[0], spec[1], spec[2])
		check(ui.board == board_before, spec[1] + ": board node not recreated")
		check(JSON.stringify(ui.session.game) == state and ui.session.combat.rng.state == rng_state, spec[1] + ": no game/RNG mutation")
		check(ui.draft == draft and ui.selected == card.id and ui.card_rotation == 1, spec[1] + ": draft, selection and rotation retained")
	# Input still targets the same logical cells after a complete fold cycle.
	ui.remove_card(card.id)
	check(ui.draft.is_empty(), "Can remove a figure after folding back")
	ui.session.game.journey.battleMode = "free"
	ui.show_info("Проверка окна", "Проверка адаптивной раскладки")
	var modal = ui.get_child(ui.get_child_count() - 1)
	await resize_to(Vector2i(896, 800), "modal-unfolded", 2)
	check(is_instance_valid(modal) and modal.visible, "Information dialog remains open after unfolding")
	modal.canceled.emit()
	await process_frame
	ui.show_character()
	await resize_to(Vector2i(432, 1008), "character-cover")
	await resize_to(Vector2i(896, 800), "character-inner")
	check(is_instance_valid(ui.character_window) and ui.screen == "game", "Character overlay remains open above the original game")
	ui.session.game.phase = "ready"
	ui.show_game()
	await resize_to(Vector2i(432, 1008), "map-cover")
	await resize_to(Vector2i(896, 800), "map-inner")
	print("ADAPTIVE_LAYOUT: %s (%d failures)" % ["PASS" if failures.is_empty() else "FAIL", failures.size()])
	quit(0 if failures.is_empty() else 1)
