extends SceneTree
const Preferences = preload("res://game/preferences.gd")
const ResourceBar = preload("res://ui/resource_bar.gd")
var ui
var failed = false
var output = ""

class MemorySaves extends RefCounted:
	var entries: Array = []
	var error = ""
	func list_heroes(): return entries.duplicate(true)
	func read(id):
		for entry in entries:
			if entry.id == id: return entry.payload.duplicate(true)
		return {}
	func write(_id, _session, _draft): return true

func _initialize(): call_deferred("run")

func check(value: bool, description: String):
	if not value:
		failed = true
		printerr("FAIL: " + description)

func control(text: String, parent = null):
	if parent == null: parent = ui
	for node in parent.get_children():
		if node is BaseButton and node.text == text: return node
		var found = control(text, node)
		if found != null: return found
	return null

func snapshot(pixels: Vector2i, name: String):
	root.size = pixels
	for _frame in 8: await process_frame
	if ui.screen == "home":
		check(not ui.scroll.get_v_scroll_bar().visible, name + ": menu fits without scrolling")
		var previous_end = 0.0
		for node in ui.home_view.menu_buttons:
			check(node.position.y >= previous_end, name + ": menu buttons do not overlap")
			check(ui.home_view.get_global_rect().encloses(node.get_global_rect()), name + ": button within safe area")
			previous_end = node.position.y + node.size.y
		check(ui.home_view.status.position.y > previous_end, name + ": status below menu")
		check(ui.home_view.get_global_rect().encloses(ui.home_view.status.get_global_rect()), name + ": status fully visible")
	if not output.is_empty() and DisplayServer.get_name() != "headless":
		await RenderingServer.frame_post_draw
		root.get_texture().get_image().save_png(output.path_join(name + ".png"))

func run():
	var args = OS.get_cmdline_user_args()
	if not args.is_empty(): output = args[0]
	var settings_path = "user://home-test-" + Crypto.new().generate_random_bytes(8).hex_encode() + ".cfg"
	ui = load("res://scenes/main.tscn").instantiate()
	ui.session = preload("res://tests/campaign_driver.gd").new(ui.data)
	var legacy = ConfigFile.new()
	legacy.set_value("display", "resource_animation", false)
	legacy.set_value("session", "last_hero", "")
	check(legacy.save(settings_path) == OK, "Legacy preferences fixture saved")
	ui.preferences = Preferences.new(settings_path)
	ui.saves = MemorySaves.new()
	root.add_child(ui)
	await process_frame
	check(control("Продолжить") == null, "Fresh install has no Continue")
	check(control("Анимация полосок ресурсов") == null, "Home has no animation toggle")
	check(ui.backdrop.texture != null, "Home artwork bundled")
	await snapshot(Vector2i(432, 1008), "home-empty")
	control("Новая игра").pressed.emit()
	check(ui.screen == "create" and ui.create_name.is_empty(), "New game opens fresh creation")
	ui.show_home()
	control("Герои").pressed.emit()
	check(ui.screen == "heroes", "Heroes opens a separate screen")
	control("Назад").pressed.emit()
	ui.session.create("Зая", {"strength": 2, "agility": 1, "vitality": 3, "intelligence": 1}, ui.data.portraits[0].id)
	var payload = {"game": ui.session.game.duplicate(true), "rngState": str(ui.session.combat.rng.state), "draft": [], "savedAt": "2026-09-27T12:00:00"}
	var older = payload.duplicate(true)
	older.game.player.name = "Странник"
	older.savedAt = "2026-09-26T12:00:00"
	ui.saves.entries = [{"id": "older", "payload": older}, {"id": "latest", "payload": payload}, {"id": "broken", "payload": {}}]
	check(ui.latest_hero(ui.saves.entries).id == "latest", "Continue chooses newest valid save, skipping corrupt files")
	ui.preferences.last_hero = "older"
	check(ui.latest_hero(ui.saves.entries).id == "older", "Explicitly chosen hero has priority")
	ui.preferences.last_hero = "missing"
	check(ui.latest_hero(ui.saves.entries).id == "latest", "Missing active hero falls back to valid save")
	ui.saves.entries.pop_back()
	ui.show_home()
	for spec in [[Vector2i(432, 1008), "home-cover"], [Vector2i(714, 1000), "home-reference"], [Vector2i(896, 800), "home-inner"], [Vector2i(800, 896), "home-inner-rotated"], [Vector2i(1008, 432), "home-landscape"]]:
		await snapshot(spec[0], spec[1])
	control("Продолжить").pressed.emit()
	check(ui.screen == "game" and ui.hero_id == "latest" and ui.session.game.player.name == "Зая", "Continue loads indicated hero")
	check(Preferences.new(settings_path).last_hero == "latest", "Last played hero remembered across launches")
	var game_before = JSON.stringify(ui.session.game)
	ui.show_home()
	check(control("Настройки") == null, "Settings entry is absent from home")
	control("Продолжить").pressed.emit()
	check(JSON.stringify(ui.session.game) == game_before, "Home navigation leaves hero state untouched")
	check(ui.preferences.write(), "Current preferences still save")
	var saved = ConfigFile.new()
	check(saved.load(settings_path) == OK and not saved.has_section_key("display", "resource_animation"), "Obsolete animation setting is no longer saved")
	check(Preferences.new(settings_path).last_hero == "latest", "Last hero survives removal of the animation option")
	# A legacy false value must not stop either resource bar from interpolating.
	for kind in ["health", "stamina"]:
		var bar = ResourceBar.new()
		ui.add_child(bar)
		bar.configure(ui.data, "", 30, 30, kind)
		bar.configure(ui.data, "", 15, 30, kind)
		check(bar.animation != null and bar.animation.is_running() and bar.fraction > 0.5, "Resource change always starts a smooth transition: " + kind)
		await bar.animation.finished
		check(is_equal_approx(bar.fraction, 0.5), "Resource animation reaches the actual value: " + kind)
		bar.queue_free()
	for suffix in ["", ".tmp"]:
		if FileAccess.file_exists(settings_path + suffix): DirAccess.remove_absolute(settings_path + suffix)
	print("HOME_SETTINGS: " + ("FAIL" if failed else "PASS"))
	quit(1 if failed else 0)
