extends SceneTree
const Flags = preload("res://game/feature_flags.gd")
const Debug = preload("res://game/debug_actions.gd")
const Session = preload("res://tests/campaign_driver.gd")
var ui
var checks = 0
var failures: Array = []
var output = ""

class MemorySaves extends RefCounted:
	var error = "Тест: ошибка записи"
	var fail = false
	var payload: Dictionary = {}
	func list_heroes(): return []
	func write(_id, session, draft):
		if fail: return false
		payload = {"format":1, "game":session.game.duplicate(true), "draft":draft.duplicate(true), "rngState":str(session.combat.rng.state)}
		return true
class MemoryPreferences extends RefCounted:
	var animated = false
	var last_hero = ""
	func write(): return true

func _initialize(): call_deferred("run")
func check(value: bool, message: String):
	checks += 1
	if not value:
		failures.append(message)
		printerr("FAIL: " + message)
func settle():
	for _i in 8: await process_frame
func shot(name: String):
	await settle()
	if output and DisplayServer.get_name() != "headless":
		RenderingServer.force_draw(false)
		root.get_texture().get_image().save_png(output.path_join(name + ".png"))
func button(caption: String, node = null):
	if node == null: node = ui
	if node is Button and node.text == caption: return node
	for child in node.get_children():
		var found = button(caption, child)
		if found != null: return found
	return null
func snapshot() -> String:
	return JSON.stringify({"game":ui.session.game, "rng":str(ui.session.combat.rng.state), "draft":ui.draft, "selected":ui.selected})
func create():
	ui.session.combat.rng.seed = 43
	ui.session.create("Отладка", {"strength":3, "agility":2, "vitality":1, "intelligence":1}, ui.data.portraits[0].id)
	ui.session.game.player.gear.weapon = "dagger"
	ui.session.game.player.gear.shield = "buckler"
	ui.session.game.player.skills = ["bandage"]
	ui.session.game.souls = 17
	ui.hero_id = "memory-debug"
	ui.draft = []
	ui.selected = ""
func restore_saved():
	var restored = Session.new(ui.data)
	check(restored.restore(ui.saves.payload).is_empty(), "Debug result restores through normal save loader")
	check(JSON.stringify(restored.game) == JSON.stringify(ui.session.game), "Saved debug result retains the whole game")
	check(restored.combat.rng.state == ui.session.combat.rng.state and ui.saves.payload.draft.is_empty(), "Saved RNG matches, old draft is cleared")

func run():
	var configured = ProjectSettings.get_setting("features/debug_tools", false)
	check(configured is bool and Flags.enabled(Flags.DEBUG_TOOLS) == configured, "Debug flag follows project configuration")
	check(not Flags.enabled("unknown_feature"), "Unknown feature flags default off")
	ProjectSettings.set_setting("features/debug_tools", true)
	root.gui_embed_subwindows = true
	root.size = Vector2i(432, 1008)
	if not OS.get_cmdline_user_args().is_empty(): output = OS.get_cmdline_user_args()[0]
	ui = load("res://scenes/main.tscn").instantiate()
	ui.session = preload("res://tests/campaign_driver.gd").new(ui.data)
	ui.saves = MemorySaves.new()
	ui.preferences = MemoryPreferences.new()
	root.add_child(ui)
	await settle()
	check(button("Перейти карту…").disabled, "Jump requires an active hero")
	await shot("debug-home")
	var before = snapshot()
	button("Бестиарий").pressed.emit()
	check(ui.screen == "bestiary" and ui.debug_catalog.entries.size() == ui.data.creatures.size(), "Bestiary lists every species, including non-combatants")
	await shot("debug-bestiary")
	for i in ui.debug_catalog.entries.size():
		var definition = ui.debug_catalog.entries[i]
		ui.debug_catalog.icons[i].pressed.emit()
		check(is_instance_valid(ui.inspection_window), "Portrait opens creature card: " + definition.id)
		var entry = ui.inspection_window.cards[0].entry
		check(entry.reference == definition.id and entry.texture != null and entry.description == definition.description, "Creature portrait/name/description use catalog: " + definition.id)
		check(entry.figures.size() == definition.figures.size(), "Card uses normal intrinsic figures: " + definition.id)
		check(not ui.inspection_window.primary.visible, "Bestiary is read-only")
		if definition.id == "wolf": await shot("debug-creature")
		ui.inspection_window.close()
		await process_frame
	check(snapshot() == before, "Bestiary does not create a hero or consume gameplay RNG")
	ui._notification(Node.NOTIFICATION_WM_GO_BACK_REQUEST)
	button("Экипировка").pressed.emit()
	check(ui.debug_catalog.entries.size() == ui.data.items.size(), "Equipment lists every weapon, armor and jewelry template")
	await shot("debug-equipment")
	for i in ui.debug_catalog.entries.size():
		var definition = ui.debug_catalog.entries[i]
		ui.debug_catalog.icons[i].pressed.emit()
		var entry = ui.inspection_window.cards[0].entry
		check(entry.reference == definition.id and entry.texture != null, "Item icon opens its own card: " + definition.id)
		check(entry.status.is_empty() and not ui.inspection_window.primary.visible, "Catalog item has no worn badge or equip action")
		ui.inspection_window.close()
		await process_frame
	check(snapshot() == before, "Equipment browsing does not mutate game or RNG")
	ui.show_home()
	create()
	ui.session.travel("fight-1")
	ui.show_game()
	for spec in [[Vector2i(320,640),"debug-combat-small"], [Vector2i(896,800),"debug-combat-fold"], [Vector2i(1888,880),"debug-combat-wide"]]:
		root.size = spec[0]
		await shot(spec[1])
		var view = ui.combat_view
		var bounds = view.get_global_rect().grow(1)
		check(bounds.encloses(view.debug_action.get_global_rect()) and bounds.encloses(view.action.get_global_rect()), "Both footer buttons fit: " + spec[1])
		check(view.debug_action.position.x > view.action.position.x and not view.action.get_rect().intersects(view.debug_action.get_rect()), "Debug win is beside ordinary action: " + spec[1])
	ui.show_character()
	ui.character_window.select_tab(3)
	button("Перейти карту…", ui.character_window).pressed.emit()
	await shot("debug-map-dialog")
	var dialog = ui.map_dialog
	var number = dialog.find_child("MapNumber", true, false)
	before = snapshot()
	for invalid in ["", "0", "-1", "1.5", "abc", "2147483648"]:
		number.text = invalid
		dialog.confirmed.emit()
		check(snapshot() == before and is_instance_valid(dialog) and dialog.visible, "Invalid map leaves state and dialog intact: " + invalid)
	dialog.canceled.emit()
	await settle()
	check(snapshot() == before and is_instance_valid(ui.character_window), "Cancel returns to game menu without changing state")
	ui.character_window.close()
	# Failed writes roll back the fight, RNG and draft before a successful retry.
	ui.selected = ui.session.game.player.deck.hand[0].id
	ui.draft = [{"id":ui.selected,"x":0,"y":0,"rotation":0}]
	ui.combat_view.refresh()
	before = snapshot()
	ui.saves.fail = true
	ui.debug_win()
	check(snapshot() == before, "Failed win save rolls back HP, reward, RNG, selection and draft")
	ui.saves.fail = false
	var shards = ui.session.game.souls
	var reward_amount = 3 # Level-one hero, ordinary victory.
	ui.combat_view.debug_action.pressed.emit()
	check(ui.session.game.phase == "victory" and ui.session.game.enemy.hp == 0 and not ui.session.game.has("clashPlan"), "Debug win ends combat and opens victory")
	check(ui.session.game.wins == 1 and ui.session.game.journey.cleared == 1 and ui.session.game.souls == shards + reward_amount, "Debug win advances stage and credits ordinary shards")
	check(not ui.session.game.rewardOptions.is_empty(), "Debug win uses normal reward options")
	restore_saved()
	before = snapshot()
	ui.debug_win()
	check(snapshot() == before, "Repeated win cannot award twice")
	await shot("debug-victory")
	# Jump from a finished fight retains hero progression, resets only the journey/fight.
	var player = ui.session.game.player.duplicate(true)
	shards = ui.session.game.souls
	ui.show_debug_map_dialog()
	await settle()
	dialog = ui.map_dialog
	number = dialog.find_child("MapNumber", true, false)
	number.text = "6"
	before = snapshot()
	ui.saves.fail = true
	dialog.confirmed.emit()
	check(snapshot() == before and dialog.visible, "Failed map save rolls back the generated journey and RNG")
	ui.saves.fail = false
	dialog.confirmed.emit()
	await settle()
	check(ui.session.game.journey.expedition == 6 and ui.session.game.phase == "story" and ui.screen == "game", "Jump opens requested map")
	restore_saved()
	ui.session.dialogues()
	for key in ["name", "stats", "gear", "skills", "portraitId"]: check(ui.session.game.player[key] == player[key], "Jump preserves hero " + key)
	check(ui.session.game.souls == shards and ui.session.game.wins == 1, "Jump preserves shards and wins")
	check(ui.session.available_nodes() == ["fight-1"] and ui.session.game.journey.cleared == 0 and ui.session.game.journey.enemies.size() == 5, "Destination has fresh route and all five opponents")
	check(ui.session.game.journey.battleMode == "expendable" and not ui.session.game.enemy.has("creatureVariant"), "Destination uses normal map mode and encounter balance")
	check(not ui.session.game.player.has("deck") and not ui.session.game.has("victoryReward") and ui.session.game.rewardOptions.is_empty(), "Jump removes old deck and unclaimed reward")
	check(ui.session.game.player.hp == ui.data.max_hp(ui.session.game.player) and ui.session.game.player.stamina == ui.data.balance.stamina.max, "Jump restores resources like a new journey")
	ui.session.dialogues()
	check(ui.session.travel("fight-1").is_empty(), "Destination's first battle can start")
	check(ui.session.game.player.deck.hand.size() == ui.data.balance.handSize, "Destination deals a fresh hand")
	check(Debug.go_to_map(ui.session,"1").is_empty() and ui.session.game.enemy.creatureVariant == "introductory", "Jump back restores introductory balance on map one")
	# Win during reveal and boss victory both use the same ordinary completion path.
	ui.session.game.journey.path = ["camp-4"]
	ui.session.game.journey.awaitingFirstBattle = false
	ui.session.game.journey.cleared = 4
	ui.session.fight_fixture(5)
	ui.session.game.clashPlan.preparer = "player"
	check(ui.session.submit([]).is_empty() and ui.session.game.clashPlan.stage == "reveal", "Reveal fixture begins")
	ui.show_game()
	ui.debug_win()
	check(ui.session.game.phase == "victory" and ui.session.game.journey.finished, "Win from boss reveal completes the map")
	ui.session.game.rewardOptions = []
	check(ui.session.complete_reward().is_empty() and ui.session.game.victoryReward.progressionPending, "Boss reward offers an affordable upgrade before leaving the map")
	check(ui.session.complete_reward().is_empty() and ui.session.game.journey.expedition == 2, "Continue after boss reward advances to following map normally")
	# One flag removes every entry point and blocks calls even with a live session.
	ProjectSettings.set_setting("features/debug_tools", false)
	before = snapshot()
	check(not Debug.go_to_map(ui.session,"99").is_empty() and not Debug.win(ui.session).is_empty(), "Disabled actions reject direct calls")
	ui.show_home()
	for caption in ["Бестиарий", "Экипировка", "Перейти карту…"]: check(button(caption) == null, "Disabled home entry absent: " + caption)
	ui.show_debug_catalog(true)
	ui.show_catalog_entry("wolf", true)
	ui.show_debug_map_dialog()
	check(ui.screen == "home" and not is_instance_valid(ui.inspection_window) and not is_instance_valid(ui.map_dialog), "Disabled catalog/dialog entry points cannot be invoked")
	check(snapshot() == before, "Disabled calls never change state or RNG")
	ui.session.travel("fight-1")
	ui.show_game()
	await settle()
	check(not ui.combat_view.debug_action.visible and is_equal_approx(ui.combat_view.action.size.x, ui.combat_view.hand.size.x), "Disabled footer returns to one full-width action")
	before = snapshot()
	check(not Debug.win(ui.session).is_empty(), "Disabled direct win is rejected during an active battle")
	ui.combat_view.debug_action.pressed.emit()
	check(snapshot() == before, "Hidden debug button callback is also blocked")
	ui.show_character()
	ui.character_window.select_tab(3)
	check(button("Перейти карту…", ui.character_window) == null, "Disabled game-menu entry absent")
	ui.character_window.close()
	ui.show_battle_menu()
	check(button("Перейти карту…") == null, "Disabled legacy battle-menu entry absent")
	ProjectSettings.set_setting("features/debug_tools", configured)
	print("DEBUG_TOOLS: %s (%d checks; %d failures)" % ["PASS" if failures.is_empty() else "FAIL", checks, failures.size()])
	quit(0 if failures.is_empty() else 1)
