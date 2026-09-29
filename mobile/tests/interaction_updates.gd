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
	var animated = false
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
	var screen = ui.combat_view
	check(screen.skip.disabled, "Cannot skip with full stamina")
	var before = ui.session.game.duplicate(true)
	screen.skip.pressed.emit()
	check(ui.session.game == before, "Disabled skip callback cannot advance a turn")
	ui.session.game.player.stamina -= 1
	screen.refresh()
	check(not screen.skip.disabled, "Empty board and missing stamina enable skip")
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
	check(not inspection.secondary.visible and inspection.footer_hint.text.begins_with("Вы потеряете:"), "Comparison footer has only replace, close and loss hint")
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
