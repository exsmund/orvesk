extends SceneTree
const Modal = preload("res://ui/modal_dialog.gd")
const Help = preload("res://ui/combat_help_dialog.gd")
var ui
var checks = 0
var failures: Array = []
var output = ""

class MemorySaves extends RefCounted:
	var error = "Тест: не удалось записать"
	var fail = false
	var saved: Dictionary = {}
	func list_heroes(): return []
	func write(_id, session, _draft):
		if fail: return false
		saved = {"game": session.game.duplicate(true), "rngState": str(session.combat.rng.state)}
		return true
class MemoryPreferences extends RefCounted:
	var completed_difficulties: Array = []
	func record_completed(ids):
		for id in ids:
			if id not in completed_difficulties: completed_difficulties.append(id)
		return true
	var last_hero = ""
	func write(): return true

func _initialize(): call_deferred("run")
func check(value: bool, description: String):
	checks += 1
	if not value:
		failures.append(description)
		printerr("FAIL: " + description)
func settle():
	for _i in 8: await process_frame
func dialog():
	for child in ui.get_children():
		if child is Modal and child.visible and not child.closing: return child
	return null
func shot(name: String):
	await settle()
	if output and DisplayServer.get_name() != "headless":
		RenderingServer.force_draw(false)
		root.get_texture().get_image().save_png(output.path_join(name + ".png"))

func illustrated_help_checks(help):
	var guide = ui.data.read_json("combat-help")
	check(help.lessons.size() == 4 and help.illustrations.size() == 4, "Tutorial renders four illustrated lessons")
	check(not help.message.visible, "Old continuous tutorial text is hidden")
	for i in help.lessons.size():
		check(help.lessons[i].get_child(0).text == guide.sections[i].text, "Tutorial paragraph comes from canonical config")
		var texture = help.illustrations[i].texture
		check(texture != null, "Tutorial illustration loads")
		if texture:
			var image = texture.get_image()
			check(image.get_pixel(0, 0).a == 0 and image.get_width() > image.get_height(), "Tutorial art is transparent and landscape")
		check(help.illustrations[i].mouse_filter == Control.MOUSE_FILTER_IGNORE, "Illustration does not intercept scrolling")
	for pixels in [Vector2i(320,640), Vector2i(432,900), Vector2i(1008,432)]:
		root.size = pixels
		help.scroll.scroll_vertical = 0
		await settle()
		var bounds = help.panel.get_global_rect().grow(1)
		check(ui.get_global_rect().encloses(bounds), "Illustrated tutorial fits viewport")
		check(help.scroll.get_global_rect().end.y < help.primary.global_position.y, "Tutorial content stays above pinned buttons")
		check(help.primary.get_global_rect().end.y < help.secondary.global_position.y, "Tutorial dismissal sits below the main action")
		check(help.primary.size.x == help.secondary.size.x and help.primary.size.x >= help.panel.size.x - 48, "Tutorial actions use the full footer width")
		check(help.secondary.flat and help.secondary.get_theme_stylebox("normal") is StyleBoxEmpty, "Tutorial dismissal uses the heroes screen text-only style")
		for illustration in help.illustrations:
			check(illustration.size.x <= help.scroll.size.x + 1, "Illustration fits body width")
		await shot("combat-help-%d-top" % pixels.x)
		var footer = help.primary.get_global_rect()
		await swipe(help.scroll)
		check(help.scroll.scroll_vertical > 0, "Tutorial scrolls by touch over its content")
		help.scroll.scroll_vertical = int(help.scroll.get_v_scroll_bar().max_value)
		await settle()
		check(help.primary.get_global_rect() == footer, "Scrolling tutorial preserves pinned buttons")
		check(help.illustrations.back().get_global_rect().end.y <= help.scroll.get_global_rect().end.y + 2, "Last lesson can be scrolled fully into view")
		await shot("combat-help-%d-bottom" % pixels.x)
	root.size = Vector2i(432,900)
	help.scroll.scroll_vertical = 0
	await settle()

func manual_help_checks():
	var old_flag = ProjectSettings.get_setting("features/debug_tools", false)
	var saved_game = ui.session.game.duplicate(true)
	var saved_draft = ui.draft.duplicate(true)
	var saved_rng = ui.session.combat.rng.state
	ProjectSettings.set_setting("features/debug_tools", true)
	ui.show_character(3)
	var window = ui.character_window
	var menu = window.pages[3]
	var captions = menu.content.get_children().filter(func(node): return node is Button).map(func(node): return node.text)
	check(captions == ["Продолжить игру", "Главное меню", "Правила", "Победить врага", "Существа", "Экипировка", "Навыки", "Перейти на карту"], "Hero menu follows requested order")
	for pixels in [Vector2i(320,640), Vector2i(432,900), Vector2i(1008,432)]:
		root.size = pixels
		await settle()
		var last_bottom = 0.0
		for button in menu.content.get_children():
			check(button.position.y >= last_bottom, "Large menu labels do not overlap")
			check(button.size.x <= menu.size.x, "Large menu labels fit the available width")
			last_bottom = button.get_rect().end.y
		await shot("hero-menu-%d" % pixels.x)
	root.size = Vector2i(432,900)
	await settle()
	menu.content.get_child(2).pressed.emit()
	await settle()
	check(dialog() is Help and not window.can_process(), "Rules opens illustrated help even when automatic help is hidden")
	dialog().primary.pressed.emit()
	await settle()
	check(dialog() == null and window.can_process() and window.current_tab == 3, "Manual OK resumes the same menu")
	check(ui.session.game == saved_game and ui.draft == saved_draft and ui.session.combat.rng.state == saved_rng, "Reading rules preserves battle, draft and RNG")
	window.close()
	await settle()
	ui.session.map_fixture(1)
	ui.session.game.player.combatHelpHidden = false
	ui.show_game()
	ui.show_character(3)
	await settle()
	var before = ui.session.game.duplicate(true)
	ui.character_window.pages[3].show_rules()
	await settle()
	check(dialog() is Help, "Rules can be read outside combat")
	ui.saves.fail = true
	dialog().secondary.pressed.emit()
	await settle()
	check(dialog() != null and dialog().error_label.visible and ui.session.game == before, "Failed manual dismissal save rolls back the preference")
	ui.saves.fail = false
	dialog().secondary.pressed.emit()
	await settle()
	check(dialog() == null and ui.session.game.player.combatHelpHidden and ui.saves.saved.game.player.combatHelpHidden, "Manual dismissal persists outside combat")
	ProjectSettings.set_setting("features/debug_tools", false)
	ui.character_window.pages[3].show_menu()
	captions = ui.character_window.pages[3].content.get_children().filter(func(node): return node is Button).map(func(node): return node.text)
	check(captions == ["Продолжить игру", "Главное меню", "Правила"], "Rules stay available without debug catalogs")
	before = ui.session.game.duplicate(true)
	ui.character_window.pages[3].show_rules()
	await settle()
	check(dialog() is Help, "Hidden tutorial remains available from Rules without debug tools")
	ui._notification(Node.NOTIFICATION_WM_GO_BACK_REQUEST)
	await settle()
	check(dialog() == null and ui.character_window.can_process() and ui.session.game == before, "Back from manual help preserves the game and returns to menu")
	ui.character_window.close()
	await settle()
	ProjectSettings.set_setting("features/debug_tools", old_flag)
	ui.session.game = saved_game
	ui.draft = saved_draft
	ui.session.combat.rng.state = saved_rng
	ui.show_game()
	await settle()

func swipe(scroll):
	var point = scroll.get_global_rect().get_center()
	var press = InputEventScreenTouch.new()
	press.position = point
	press.pressed = true
	root.push_input(press, true)
	# Real Android sends this emulated mouse stream to ScrollContainer as well.
	var mouse = InputEventMouseButton.new()
	mouse.device = -1
	mouse.position = point
	mouse.button_index = MOUSE_BUTTON_LEFT
	mouse.pressed = true
	root.push_input(mouse, true)
	for step in 6:
		var drag = InputEventScreenDrag.new()
		drag.position = point - Vector2(0, 12 * (step + 1))
		drag.relative = Vector2(0, -12)
		root.push_input(drag, true)
		var motion = InputEventMouseMotion.new()
		motion.device = -1
		motion.position = drag.position
		motion.relative = drag.relative
		motion.button_mask = MOUSE_BUTTON_MASK_LEFT
		root.push_input(motion, true)
		await process_frame
	press.position = point - Vector2(0, 72)
	press.pressed = false
	root.push_input(press, true)
	mouse.position = press.position
	mouse.pressed = false
	root.push_input(mouse, true)
	await settle()

func run():
	root.size = Vector2i(432, 900)
	if not OS.get_cmdline_user_args().is_empty(): output = OS.get_cmdline_user_args()[0]
	ui = load("res://scenes/main.tscn").instantiate()
	ui.session = preload("res://tests/campaign_driver.gd").new(ui.data)
	ui.saves = MemorySaves.new()
	ui.preferences = MemoryPreferences.new()
	root.add_child(ui)
	await settle()
	seed(93421)
	var portraits = {}
	var rng = ui.session.combat.rng.state
	for _i in 12:
		ui.start_create()
		portraits[ui.create_portrait] = true
		check(ui.create_portrait >= 0 and ui.create_portrait < ui.data.portraits.size(), "Initial random portrait belongs to catalog")
		await settle()
	check(portraits.size() > 1 and ui.session.combat.rng.state == rng, "New heroes vary portraits without consuming combat RNG")
	ui.session.create("Вереск", {"strength":3,"agility":2,"vitality":1,"intelligence":1}, ui.data.portraits[0].id)
	ui.hero_id = "memory-interactions"
	ui.session.fight_fixture(1)
	ui.session.game.player.erase("combatHelpHidden")
	var initial = ui.session.game.duplicate(true)
	ui.show_game()
	await settle()
	var help = dialog()
	check(help is Help and not ui.combat_view.can_process(), "New combat opens tutorial and suspends battle input")
	check(help.primary.text == "Ок" and help.secondary.text == "Больше не показывать", "Tutorial offers per-battle acknowledgement and per-hero dismissal")
	await illustrated_help_checks(help)
	await shot("combat-help")
	ui.saves.fail = true
	help.secondary.pressed.emit()
	await settle()
	check(help.visible and help.error_label.visible and ui.session.game == initial, "Failed tutorial save keeps dialog and rolls back preference")
	ui.saves.fail = false
	help.primary.pressed.emit()
	await settle()
	check(dialog() == null and not ui.session.game.player.get("combatHelpHidden", false), "OK closes tutorial for this battle only")
	var acknowledged = ui.saves.saved.duplicate(true)
	check(ui.session.restore(acknowledged).is_empty(), "Acknowledgement survives save reload")
	ui.show_game()
	await settle()
	check(dialog() == null, "Rebuilding or resuming this battle does not repeat acknowledged tutorial")
	ui.session.fight_fixture(1)
	ui.show_game()
	await settle()
	check(dialog() is Help, "Next battle shows tutorial after OK")
	dialog().cancel()
	await settle()
	check(not ui.session.game.player.get("combatHelpHidden", false), "Back never sets permanent dismissal")
	ui.session.fight_fixture(1)
	ui.show_game()
	await settle()
	dialog().secondary.pressed.emit()
	await settle()
	check(ui.session.game.player.combatHelpHidden and ui.session.restore(ui.saves.saved).is_empty(), "Do not show persists with hero")
	ui.session.fight_fixture(1)
	ui.show_game()
	await settle()
	check(dialog() == null, "Later battles respect hidden tutorial")
	var fresh = preload("res://game/session.gd").new(ui.data)
	fresh.create("Новый", {"strength":3,"agility":2,"vitality":1,"intelligence":1}, ui.data.portraits[1].id)
	check(not fresh.game.player.get("combatHelpHidden", false), "Another hero never inherits tutorial preference")
	await manual_help_checks()
	if "--tutorial-only" in OS.get_cmdline_user_args():
		ui.hero_id = ""
		ui.queue_free()
		await settle()
		print("COMBAT_HELP: %d checks; %d failures" % [checks, failures.size()])
		quit(0 if failures.is_empty() else 1)
		return
	var screen = ui.combat_view
	check(screen.skip.disabled, "Cannot skip with full stamina")
	var before = ui.session.game.duplicate(true)
	screen.skip.pressed.emit()
	check(ui.session.game == before, "Disabled skip callback cannot advance a turn")
	ui.session.game.player.stamina -= 1
	screen.refresh()
	check(not screen.skip.disabled and screen.action.disabled, "Empty board and missing stamina enable only skip")
	var empty_before = ui.session.game.duplicate(true)
	screen.action.pressed.emit()
	check(ui.session.game == empty_before, "Disabled confirm cannot submit an empty turn")
	var card = ui.session.game.player.deck.hand[0]
	ui.place_card(card.id, 0, 0)
	check(not ui.draft.is_empty() and screen.skip.disabled, "Any placed player figure disables skip")
	ui.draft.clear()
	screen.refresh()
	for pixels in [Vector2i(320,640),Vector2i(432,900),Vector2i(1200,700),Vector2i(2240,900)]:
		root.size = pixels
		await settle()
		check(screen.skip.get_global_rect().end.x <= screen.action.global_position.x, "Skip remains to left of main action")
		check(screen.get_global_rect().encloses(screen.action.get_global_rect()) and screen.get_global_rect().encloses(screen.skip.get_global_rect()), "Both battle actions fit adaptive layout")
		await shot("combat-actions-%d" % pixels.x)
	# A first-player rest is committed in reveal; it cannot be submitted twice.
	ui.session.game.clashPlan.preparer = "player"
	ui.session.game.clashPlan.reactor = "enemy"
	ui.session.game.clashPlan.stage = "preparation"
	screen.skip.pressed.emit()
	await settle()
	check(ui.session.game.clashPlan.stage == "reveal" and ui.combat_view.skip.disabled, "Skip commits an empty first-player turn into reveal")
	ui.combat_view.action.pressed.emit()
	await settle()
	check(ui.session.game.player.stamina == ui.data.max_stamina(ui.session.game.player), "Resolving skipped turn restores stamina")
	for _frame in 180:
		if not ui.combat_view.transition_busy: break
		await process_frame
	ui.session.game.player.stamina -= 1
	ui.session.game.clashPlan.preparer = "enemy"
	ui.session.game.clashPlan.reactor = "player"
	ui.session.game.clashPlan.stage = "reaction"
	ui.session.game.clashPlan.enemyPlaced = []
	ui.combat_view.refresh()
	var round_before = ui.session.game.round
	ui.combat_view.skip.pressed.emit()
	await settle()
	check(ui.session.game.round == round_before + 1 and ui.session.game.player.stamina == ui.data.max_stamina(ui.session.game.player), "Second-player skip resolves and restores stamina immediately")
	# Long cell reports use touch scrolling through RichTextLabel, with pinned chrome.
	root.size = Vector2i(432, 640)
	ui.show_combat_report("Клетка · разбор", "Атака против блока. Подробный расчёт урона и выносливости.\n".repeat(45))
	await settle()
	var report = dialog()
	var head = report.header.get_global_rect()
	var foot = report.primary.get_global_rect()
	await swipe(report.scroll)
	check(report.scroll.scroll_vertical > 20, "Swiping report text scrolls the details body")
	check(report.header.get_global_rect() == head and report.primary.get_global_rect() == foot, "Report chrome stays fixed during swipe")
	await shot("cell-scroll")
	report.close()
	await settle()
	# Both real worn items are at risk when selecting a two-handed reward.
	ui.session.game = initial.duplicate(true)
	ui.session.game.player.combatHelpHidden = true
	ui.session.game.phase = "victory"
	ui.session.finish_battle()
	ui.session.game.player.gear.weapon = "dagger"
	ui.session.game.player.gear.shield = "buckler"
	ui.session.game.player.stats.strength = 10
	ui.session.game.rewardOptions = [{"kind":"item", "itemId":"greatsword@2"}]
	ui.show_game()
	ui.show_reward_details(0)
	await settle()
	var inspection = ui.inspection_window
	check(inspection.primary.visible and inspection.close_button.visible and inspection.footer_hint.text.begins_with("Вы потеряете:"), "Comparison footer has only replace, close and loss hint")
	before = ui.session.game.duplicate(true)
	inspection.confirmed.emit()
	await settle()
	check(dialog().destructive and dialog().dialog_text.contains(ui.data.item("dagger").name) and dialog().dialog_text.contains(ui.data.item("buckler").name), "Replacement confirmation names both real lost items")
	await shot("replacement-confirmation")
	dialog().cancel()
	await settle()
	check(ui.session.game == before and inspection.can_process(), "Cancel preserves gear, reward and comparison")
	inspection.confirmed.emit()
	await settle()
	ui.session.game.player.gear.shield = null
	var changed = ui.session.game.duplicate(true)
	dialog().accept()
	await settle()
	check(ui.session.game == changed and inspection.warning.visible, "Confirmation cannot replace a changed loadout")
	ui.session.game = before.duplicate(true)
	ui.saves.fail = true
	inspection.confirmed.emit()
	await settle()
	dialog().accept()
	await settle()
	check(ui.session.game == before and inspection.warning.text == ui.saves.error, "Failed replacement save preserves both worn items, reward and balance")
	ui.saves.fail = false
	inspection.confirmed.emit()
	await settle()
	dialog().accept()
	await settle()
	check(ui.session.game.player.gear.weapon == "greatsword@2" and not ui.session.game.player.gear.shield, "Confirmed replacement equips reward and removes both displaced items")
	root.size = Vector2i(1200, 900)
	ui.show_item_details("greatsword@2")
	await settle()
	check(ui.inspection_window.panel.size.x <= 380, "Standalone inspection is narrow even on wide screens")
	await shot("standalone-inspection")
	ui.inspection_window.close()
	await settle()
	ui.session.game = before.duplicate(true)
	ui.show_game()
	ui.show_reward_details(0)
	await settle()
	ui.inspection_window.close_button.pressed.emit()
	await settle()
	check(ui.session.game == before and not is_instance_valid(ui.inspection_window), "Comparison X leaves both equipped items and reward untouched")
	ui.hero_id = ""
	ui.queue_free()
	await settle()
	print("INTERACTION_UPDATES: %s (%d checks; %d failures)" % ["PASS" if failures.is_empty() else "FAIL", checks, failures.size()])
	quit(0 if failures.is_empty() else 1)
