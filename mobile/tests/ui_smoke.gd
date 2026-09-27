extends SceneTree
var ui
var output = ""
var failed = false

func _initialize():
	call_deferred("run")

func verify(condition: bool, name: String):
	if not condition:
		failed = true
		printerr("UI FAIL: " + name)

func snapshot(name: String):
	await process_frame
	await process_frame
	if not output.is_empty() and DisplayServer.get_name() != "headless":
		RenderingServer.force_draw(false)
		root.get_texture().get_image().save_png(output.path_join(name + ".png"))

func run():
	var args = OS.get_cmdline_user_args()
	if not args.is_empty(): output = args[0]
	ui = load("res://scenes/main.tscn").instantiate()
	root.add_child(ui)
	await process_frame
	await snapshot("home")
	ui.show_create()
	await snapshot("create")
	ui.session.create("Странник", {"strength": 2, "agility": 1, "vitality": 3, "intelligence": 1}, ui.data.portraits[0].id)
	ui.hero_id = "ui-test-" + Crypto.new().generate_random_bytes(8).hex_encode()
	ui.show_game()
	await snapshot("map")
	ui.session.travel("fight-1")
	ui.show_game()
	await snapshot("combat")
	var card = ui.session.game.player.deck.hand[0]
	ui.selected = card.id
	ui.place_selected(0)
	verify(ui.draft.size() == 1, "Tap places card")
	ui.place_selected(0)
	verify(ui.draft.is_empty(), "Tap removes card")
	ui.selected = card.id
	ui.board.card_dropped.emit(card.id, 0)
	verify(ui.draft.size() == 1, "Drop places card")
	ui.show_character()
	await snapshot("character")
	ui.session.game.phase = "victory"
	ui.session.finish_battle()
	ui.show_game()
	await snapshot("reward")
	ui.session.reward(0)
	ui.session.travel("camp-1")
	ui.show_game()
	await snapshot("camp")
	ui.session.game.phase = "defeat"
	ui.session.finish_battle()
	ui.show_game()
	await snapshot("defeat")
	for suffix in ["", ".bak", ".tmp"]:
		var path = ui.saves.path(ui.hero_id) + suffix
		if FileAccess.file_exists(path): DirAccess.remove_absolute(path)
	ui.hero_id = ""
	print("UI_SMOKE: " + ("FAIL" if failed else "PASS"))
	quit(1 if failed else 0)
