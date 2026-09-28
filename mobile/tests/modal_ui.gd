extends SceneTree
const Modal = preload("res://ui/modal_dialog.gd")
var ui
var failures: Array = []
var checks = 0
var output = ""
class MemorySaves extends RefCounted:
	var error = ""
	func list_heroes(): return []
	func write(_id, _session, _draft): return true
class MemoryPreferences extends RefCounted:
	var animated = false
	var last_hero = ""
	func write(): return true
func _initialize(): call_deferred("run")
func check(ok: bool, text: String):
	checks += 1
	if not ok:
		failures.append(text)
		printerr("FAIL: " + text)
func settle():
	for _i in 8: await process_frame
func shot(name):
	if output and DisplayServer.get_name() != "headless":
		RenderingServer.force_draw(false)
		root.get_texture().get_image().save_png(output.path_join(name + ".png"))
func key(code):
	var event = InputEventKey.new()
	event.pressed = true
	event.keycode = code
	root.push_input(event, true)
func active():
	return ui.get_children().filter(func(node): return node is Modal and node.visible).back()
func run():
	root.size = Vector2i(480, 1000)
	if not OS.get_cmdline_user_args().is_empty(): output = OS.get_cmdline_user_args()[0]
	ui = load("res://scenes/main.tscn").instantiate()
	ui.saves = MemorySaves.new()
	ui.preferences = MemoryPreferences.new()
	root.add_child(ui)
	ui.start_create()
	ui.create_name = "Зая"
	ui.creation_view.step = 1
	ui.creation_view.refresh()
	await settle()
	var view = ui.creation_view
	check(view.actions.hint.visible and view.actions.hint.text == "Распределите 3 очка", "Allocation hint shown above action")
	check(view.actions.hint.get_global_rect().end.y <= view.action.get_global_rect().position.y + 0.5, "Hint clears action")
	shot("creation-attributes")
	ui.show_info("Проверка", "Короткое сообщение.")
	var dialog = active()
	await settle()
	check(not view.can_process(), "Underlying creation screen is suspended")
	key(KEY_TAB)
	check(dialog.is_ancestor_of(root.gui_get_focus_owner()), "Tab focus stays inside dialog")
	key(KEY_ESCAPE)
	await settle()
	check(ui.creation_view == view and view.step == 1 and view.can_process(), "Escape closes only dialog and restores creation")
	ui.show_info("Длинный отчёт", "Описание действия и результатов хода.\n".repeat(100))
	dialog = active()
	for pixels in [Vector2i(320,640), Vector2i(480,1000), Vector2i(1008,432), Vector2i(2200,900)]:
		root.size = pixels
		await settle()
		var bounds = dialog.panel.get_global_rect().grow(1)
		check(ui.get_global_rect().encloses(bounds), "Dialog fits viewport after resize")
		check(bounds.encloses(dialog.scroll.get_global_rect()) and bounds.encloses(dialog.primary.get_global_rect()), "Content and fixed action fit dialog")
		check(dialog.scroll.get_rect().end.y < dialog.primary.position.y, "Body does not overlap footer")
		check(dialog.scroll.get_v_scroll_bar().max_value > dialog.scroll.size.y, "Long report can scroll")
		var footer = dialog.primary.get_global_rect()
		dialog.scroll.scroll_vertical = 200
		await settle()
		check(dialog.primary.get_global_rect() == footer, "Scrolling report preserves footer")
	ui.show_info("Вложенное окно", "Сообщение поверх отчёта")
	var nested = active()
	check(not dialog.can_process(), "Nested dialog suspends earlier dialog")
	nested.cancel()
	await settle()
	check(dialog.can_process() and not view.can_process(), "Nested close restores only its parent")
	ui._notification(Control.NOTIFICATION_WM_GO_BACK_REQUEST)
	await settle()
	check(ui.creation_view == view and view.can_process(), "Android Back closes dialog before creation page")
	ui.show_heroes()
	ui.confirm_hero_removal("memory-only", "Зая")
	dialog = active()
	root.size = Vector2i(480,1000)
	await settle()
	check(dialog.destructive and dialog.primary.material != null and dialog.secondary.material == null, "Only Delete uses destructive stone tint")
	check(root.gui_get_focus_owner() == dialog.secondary, "Destructive dialog initially focuses Cancel")
	check(dialog.message.text.contains("Это действие нельзя отменить"), "Delete explains irreversible progress loss")
	shot("delete-dialog")
	dialog.secondary.pressed.emit()
	await settle()
	check(ui.heroes_view.can_process(), "Cancel restores roster")
	ui.session = preload("res://tests/campaign_driver.gd").new(ui.data)
	ui.session.create("Зая", {"strength":2,"agility":2,"vitality":2,"intelligence":1}, ui.data.portraits[0].id)
	ui.hero_id = "memory-only"
	ui.session.fight_fixture(1)
	ui.show_game()
	ui.show_character(1)
	await settle()
	var attributes = ui.character_window.pages[1]
	check(attributes.warning.get_script() == preload("res://ui/action_hint.gd"), "Combat warning uses the common hint")
	for row in attributes.rows.values():
		check(row.plus.visible and row.minus.visible and row.plus.disabled and row.minus.disabled, "Battle retains disabled stat controls")
	shot("combat-attributes")
	ui.show_battle_menu()
	await settle()
	check(active() is Modal, "Battle menu uses ordinary dialog")
	active().cancel()
	ui.confirm_finish()
	await settle()
	check(active().secondary.visible, "Finishing actions asks through common confirmation")
	active().cancel()
	ui.show_debug_map_dialog()
	await settle()
	check(active().find_child("MapNumber", true, false) is LineEdit, "Debug input lives in common dialog")
	active().cancel()
	ui.queue_free()
	await settle()
	print("MODAL_UI: %s (%d checks; %d failures)" % ["PASS" if failures.is_empty() else "FAIL", checks, failures.size()])
	quit(0 if failures.is_empty() else 1)
