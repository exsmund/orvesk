extends SceneTree
const ModalDialog = preload("res://ui/modal_dialog.gd")
var ui
var checks = 0
var failures: Array = []
var output = ""

class MemorySaves extends RefCounted:
	var error = "Тест: не удалось удалить сохранение"
	var entries: Array = []
	var fail = false
	var writes = 0
	func list_heroes(): return entries.duplicate(true)
	func read(id):
		for entry in entries:
			if entry.id == id: return entry.payload.duplicate(true)
		return {}
	func write(_id, _session, _draft):
		writes += 1
		return true
	func remove(id):
		if fail: return false
		entries = entries.filter(func(entry): return entry.id != id)
		return true

class MemoryPreferences extends RefCounted:
	var animated = false
	var last_hero = ""
	func write(): return true

func _initialize(): call_deferred("run")
func check(ok: bool, message: String):
	checks += 1
	if not ok:
		failures.append(message)
		printerr("FAIL: " + message)
func settle():
	for _i in 8: await process_frame
func shot(name: String):
	if output and DisplayServer.get_name() != "headless":
		RenderingServer.force_draw(false)
		root.get_texture().get_image().save_png(output.path_join(name + ".png"))
func check_empty_layout(context: String):
	var view = ui.heroes_view
	var text_rect = view.empty.get_global_rect()
	check(view.empty.visible and view.rows.is_empty(), context + ": empty message is visible")
	check(view.panel.get_global_rect().encloses(text_rect), context + ": empty message stays inside the frame")
	check(text_rect.position.y > view.header.get_global_rect().end.y, context + ": message starts below the header")
	check(text_rect.end.y < view.actions.get_global_rect().position.y, context + ": message never overlaps the fixed actions")
	check(absf(text_rect.get_center().y - view.scroll.get_global_rect().get_center().y) < 1, context + ": message is centered in the roster area")
	for button in [view.actions.primary, view.actions.back]:
		check(not button.disabled and view.panel.get_global_rect().encloses(button.get_global_rect()), context + ": navigation remains available")

func click(point: Vector2):
	for down in [true, false]:
		var event = InputEventMouseButton.new()
		event.position = point
		event.button_index = MOUSE_BUTTON_LEFT
		event.pressed = down
		root.push_input(event, true)
func dialog():
	for node in ui.get_children():
		if node is ModalDialog and node.visible: return node
	return null

func run():
	root.gui_embed_subwindows = true
	root.size = Vector2i(432,1008)
	if not OS.get_cmdline_user_args().is_empty(): output = OS.get_cmdline_user_args()[0]
	ui = load("res://scenes/main.tscn").instantiate()
	ui.saves = MemorySaves.new()
	ui.preferences = MemoryPreferences.new()
	root.add_child(ui)
	await settle()
	ui.show_heroes()
	await settle()
	check(ui.heroes_view.empty.visible and not ui.heroes_view.actions.primary.disabled, "Empty list offers a new story")
	check_empty_layout("First opening")
	shot("heroes-empty")
	for pixels in [Vector2i(838,922), Vector2i(320,640), Vector2i(896,800), Vector2i(1008,432), Vector2i(2240,900), Vector2i(432,1600)]:
		root.size = pixels
		await settle()
		check_empty_layout("Resize %s" % pixels)
		ui.show_heroes()
		await settle()
		check_empty_layout("Fresh opening %s" % pixels)
		shot("heroes-empty-%dx%d" % [pixels.x,pixels.y])
	root.size = Vector2i(432,1008)
	await settle()
	ui.heroes_view.actions.primary.pressed.emit()
	check(ui.screen == "create" and ui.create_name.is_empty(), "New game opens step one")
	ui.show_heroes()
	var names = ["Зая", "Рен", "Иль"]
	for i in 3:
		var candidate = preload("res://tests/campaign_driver.gd").new(ui.data)
		check(candidate.create(names[i], {"strength":2,"agility":2,"vitality":2,"intelligence":1}, ui.data.portraits[i].id).is_empty(), "Fixture uses real hero creation")
		candidate.game.player.stats.strength += i * 2
		if i > 0: candidate.map_fixture(i+1)
		if i == 0:
			candidate.fight_fixture(1)
			candidate.game.enemy.hp = 0
			candidate.game.phase = "victory"
			candidate.finish_battle()
		elif i == 2:
			var camps = candidate.game.journey.map.nodes.filter(func(n): return n.get("mapPointType", "") == "campfire")
			if not camps.is_empty(): candidate.game.journey.path = [camps[0].id]
		var payload = {"format":1, "game":candidate.game.duplicate(true), "rngState":str(candidate.combat.rng.state), "draft":[], "savedAt":"2026-09-28T12:00:0%d" % (3-i)}
		ui.saves.entries.append({"id":"test-%d" % i,"payload":payload})
	var original = ui.saves.entries.duplicate(true)
	ui.show_heroes()
	var view = ui.heroes_view
	for pixels in [Vector2i(432,1008), Vector2i(320,640), Vector2i(896,800), Vector2i(1008,432), Vector2i(2240,900), Vector2i(432,1600)]:
		root.size = pixels
		await settle()
		check(ui.heroes_view == view and ui.saves.entries == original, "Resize keeps roster and saves intact")
		var bounds = view.panel.get_global_rect().grow(1)
		check(ui.get_global_rect().grow(1).encloses(bounds), "Roster frame fits safe viewport")
		for control in [view.header, view.scroll, view.actions]: check(bounds.encloses(control.get_global_rect()), "Fixed chrome and list fit the frame")
		check(view.scroll.get_global_rect().end.y < view.actions.get_global_rect().position.y, "Scrolling list never covers actions")
		for row in view.rows:
			check(is_equal_approx(row.portrait.size.x,row.portrait.size.y), "Portrait crop remains square")
			check(row.frame.get_rect().encloses(row.portrait.get_rect()), "Portrait stays inside circular frame")
			check(row.hero_name.get_global_rect().end.x <= row.delete_button.global_position.x, "Hero name clears delete control")
			check(is_equal_approx(row.delete_button.size.x,row.delete_button.size.y), "Delete stays square")
		shot("heroes-%dx%d" % [pixels.x,pixels.y])
	root.size = Vector2i(432,1008)
	await settle()
	check(view.rows[0].hero_name.text == "Зая" and view.rows[0].location.text == "Карта 1 · Награда", "Roster shows saved names and progress, newest first")
	click(view.rows[1].portrait.get_global_rect().get_center())
	await settle()
	check(ui.hero_id == "test-1" and ui.screen == "game" and ui.session.game.player.name == "Рен", "Portrait click continues the chosen hero")
	var active_game = ui.session.game.duplicate(true)
	ui.show_heroes()
	await settle()
	ui.heroes_view.rows[1].delete_button.pressed.emit()
	await settle()
	check(dialog() != null and ui.saves.entries == original, "Trash asks for confirmation before deleting")
	dialog().canceled.emit()
	await settle()
	check(ui.saves.entries == original and ui.session.game == active_game, "Cancel leaves hero and active game untouched")
	ui.saves.fail = true
	ui.heroes_view.rows[1].delete_button.pressed.emit()
	dialog().confirmed.emit()
	await settle()
	check(ui.saves.entries == original and ui.hero_id == "test-1" and ui.heroes_view.notice.visible, "Failed deletion stays visible without losing active hero")
	ui.saves.fail = false
	ui.heroes_view.rows[1].delete_button.pressed.emit()
	dialog().confirmed.emit()
	await settle()
	check(ui.heroes_view.rows.size() == 2 and ui.hero_id.is_empty() and ui.preferences.last_hero.is_empty(), "Delete removes only the selected hero and clears its continuation pointer")
	var writes = ui.saves.writes
	ui.persist()
	check(ui.saves.writes == writes and ui.session.game.is_empty(), "Autosave cannot resurrect a deleted active hero")
	for i in 10:
		var copy = original[0].duplicate(true)
		copy.id = "many-%d" % i
		copy.payload.game.player.name = "Очень длинное имя героя"
		ui.saves.entries.append(copy)
	ui.saves.entries.append({"id":"broken","payload":{}})
	ui.show_heroes()
	await settle()
	view = ui.heroes_view
	var header_before = view.header.get_global_rect()
	var footer_before = view.actions.get_global_rect()
	view.scroll.scroll_vertical = 100000
	await settle()
	check(view.scroll.scroll_vertical > 0 and not view.scroll.get_v_scroll_bar().visible, "Long list scrolls without a visible scrollbar")
	check(view.header.get_global_rect() == header_before and view.actions.get_global_rect() == footer_before, "Scrolling keeps header and footer fixed")
	check(view.rows.back().hero_name.text == "Повреждённое сохранение", "Damaged save remains in the roster")
	view.rows.back().open_button.pressed.emit()
	check(ui.screen == "heroes" and view.notice.visible, "Unreadable save reports an error inside the roster")
	shot("heroes-long-list")
	# Removing the final saved hero must return to the same usable empty layout.
	ui.saves.entries = [original[0].duplicate(true)]
	ui.show_heroes()
	await settle()
	ui.heroes_view.rows[0].delete_button.pressed.emit()
	dialog().confirmed.emit()
	await settle()
	check(ui.saves.entries.is_empty(), "Final hero removed from the in-memory store")
	check_empty_layout("After deleting the last hero")
	shot("heroes-empty-after-delete")
	click(ui.heroes_view.actions.back.get_global_rect().get_center())
	await settle()
	check(ui.screen == "home", "Empty message does not intercept the Back button")
	ui.show_heroes()
	ui._notification(Node.NOTIFICATION_WM_GO_BACK_REQUEST)
	check(ui.screen == "home", "Android Back returns to main menu")
	# Real deletion is tested only in an isolated temporary store.
	var folder = OS.get_cache_dir().path_join("orvesk-delete-test-" + Crypto.new().generate_random_bytes(8).hex_encode())
	var store = preload("res://game/save_store.gd").new(folder)
	var fixture = preload("res://game/session.gd").new(ui.data)
	fixture.restore(original[0].payload)
	check(store.write("victim", fixture) and store.write("victim", fixture) and store.write("keep", fixture), "Temporary main and backup saves written")
	DirAccess.copy_absolute(store.path("victim"), store.path("victim")+".tmp")
	check(not store.remove("../keep") and FileAccess.file_exists(store.path("keep")), "Invalid id never targets another file")
	check(store.remove("victim"), "Store removes selected hero")
	for suffix in ["", ".bak", ".tmp"]: check(not FileAccess.file_exists(store.path("victim")+suffix), "No remaining file can restore the deleted hero")
	check(store.read("victim").is_empty() and store.list_heroes().size() == 1 and not store.read("keep").is_empty(), "Other story remains loadable")
	store.remove("keep")
	DirAccess.remove_absolute(folder)
	ui.hero_id = ""
	print("HEROES_UI: %s (%d checks; %d failures)" % ["PASS" if failures.is_empty() else "FAIL", checks, failures.size()])
	quit(0 if failures.is_empty() else 1)
