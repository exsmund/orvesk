extends SceneTree
const Model = preload("res://ui/inspection_model.gd")
const Fixtures = preload("res://tests/inspection.gd")
var ui
var output = ""
var checks = 0
var failures: Array = []
func _initialize(): call_deferred("run")
func check(value: bool, message: String):
	checks += 1
	if not value: failures.append(message); printerr("FAIL: " + message)
func settle():
	for _i in 10: await process_frame
func shot(name: String):
	await settle()
	if output and DisplayServer.get_name() != "headless":
		RenderingServer.force_draw(false)
		root.get_texture().get_image().save_png(output.path_join(name + ".png"))
func click(point: Vector2):
	for pressed in [true, false]:
		var event = InputEventMouseButton.new()
		event.position = point
		event.button_index = MOUSE_BUTTON_LEFT
		event.pressed = pressed
		root.push_input(event, true)
func escape():
	var event = InputEventKey.new()
	event.keycode = KEY_ESCAPE
	event.pressed = true
	root.push_input(event, true)
func swipe_equipment(window):
	window.scroll.scroll_vertical = 10000
	await settle()
	var point = window.profile.equipment.slots.body.get_global_rect().get_center()
	check(window.scroll.get_global_rect().has_point(point), "touch starts on equipped body slot")
	var offset = window.scroll.scroll_vertical
	var press = InputEventScreenTouch.new()
	press.position = point
	press.pressed = true
	root.push_input(press, true)
	# push_input bypasses Input's touch-to-mouse emulation. Supply the same
	# emulated stream Android sends to the built-in ScrollContainer.
	var mouse = InputEventMouseButton.new()
	mouse.device = -1
	mouse.position = point
	mouse.button_index = MOUSE_BUTTON_LEFT
	mouse.pressed = true
	root.push_input(mouse, true)
	for step in 6:
		var drag = InputEventScreenDrag.new()
		drag.position = point + Vector2(0, 14 * (step + 1))
		drag.relative = Vector2(0, 14)
		root.push_input(drag, true)
		var motion = InputEventMouseMotion.new()
		motion.device = -1
		motion.position = drag.position
		motion.relative = drag.relative
		motion.button_mask = MOUSE_BUTTON_MASK_LEFT
		root.push_input(motion, true)
		await process_frame
	press.position = point + Vector2(0, 84)
	press.pressed = false
	root.push_input(press, true)
	mouse.position = press.position
	mouse.pressed = false
	root.push_input(mouse, true)
	await settle()
	check(window.scroll.scroll_vertical < offset - 20, "mannequin equipment allows touch scrolling")
	check(ui.inspection_window == null, "swipe does not open an equipment card")

func run():
	if not OS.get_cmdline_user_args().is_empty(): output = OS.get_cmdline_user_args()[0]
	root.size = Vector2i(480, 900)
	ui = load("res://scenes/main.tscn").instantiate()
	ui.session = preload("res://tests/campaign_driver.gd").new(ui.data)
	ui.saves = Fixtures.MemorySaves.new()
	ui.preferences = Fixtures.MemoryPreferences.new()
	root.add_child(ui)
	await settle()
	ui.session.create("Герой", {"strength":1,"agility":2,"vitality":1,"intelligence":3}, ui.data.portraits[0].id)
	ui.hero_id = "memory-enemy"
	ui.session.fight_fixture(1)
	var enemy = ui.session.fighter("Страж последнего караула", {"strength":8,"agility":5,"vitality":4,"intelligence":1}, ui.data.portraits[1].id)
	enemy.gear.weapon = "greatsword@5"
	enemy.gear.body = "plate@3"
	enemy.gear.feet = "bare-foot"
	ui.session.game.enemy = enemy
	ui.session.combat.begin(ui.session.game)
	ui.show_game()
	await settle()
	var before = ui.session.game.duplicate(true)
	var rng = ui.session.combat.rng.state
	var draft = ui.draft.duplicate(true)
	click(ui.combat_view.header.enemy_portrait.get_global_rect().get_center())
	await settle()
	check(is_instance_valid(ui.enemy_window), "battle portrait opens enemy card")
	var window = ui.enemy_window
	check(window.profile.fighter_name.text == enemy.name and window.profile.level.text == "Уровень 12", "name and actual level come from enemy instance")
	check(window.profile.portrait.texture != null and window.profile.equipment != null, "human has portrait and equipment mannequin")
	check(window.profile.equipment.slots.size() == ui.data.SLOTS.size(), "human equipment uses all configured slots")
	check(ui.margin.process_mode == Node.PROCESS_MODE_DISABLED, "enemy card suspends battle input")
	await shot("enemy-human")
	for dimensions in [Vector2i(320, 740), Vector2i(480, 900), Vector2i(1008, 432), Vector2i(1600, 700)]:
		root.size = dimensions
		await settle()
		check(ui.get_global_rect().grow(1).encloses(window.panel.get_global_rect()), "enemy window fits " + str(dimensions))
		check(window.body.size.x <= window.scroll.size.x + 1, "no horizontal overflow " + str(dimensions))
		var title_rect = window.title.get_global_rect()
		var footer_rect = window.close_button.get_global_rect()
		window.scroll.scroll_vertical = 10000
		await settle()
		check(title_rect == window.title.get_global_rect() and footer_rect == window.close_button.get_global_rect(), "portrait and mannequin scroll beneath fixed chrome")
	root.size = Vector2i(480, 900)
	await settle()
	window.scroll.scroll_vertical = 10000
	await settle()
	await swipe_equipment(window)
	window.scroll.scroll_vertical = 10000
	await settle()
	click(window.profile.equipment.slots.weapon.get_global_rect().get_center())
	await settle()
	var item_window = ui.inspection_window
	check(is_instance_valid(item_window) and item_window.parent_window == window, "worn enemy weapon opens nested inspection")
	var card = item_window.cards[0]
	check(card.entry.fighter.stats == enemy.stats and card.entry.fighter.stats != ui.session.game.player.stats, "inspection uses enemy attributes")
	check(card.entry.reference == "greatsword@5" and card.entry.opponent, "inspection preserves weapon level and opponent frames")
	check(card.entry.metadata == "Редкое · Уровень 5 · Двуручное", "tier level and handedness share metadata line")
	check(card.title_label.get_theme_color("font_color") == Color("#91ADD9"), "rare name is blue")
	check(not item_window.primary.visible and not card.upgrade_button.visible, "enemy gear is read-only")
	check(window.process_mode == Node.PROCESS_MODE_DISABLED, "nested item suspends only its parent")
	await shot("enemy-weapon")
	escape()
	await settle()
	check(ui.inspection_window == null and ui.enemy_window == window and window.can_process(), "Escape returns to enemy card")
	check(ui.margin.process_mode == Node.PROCESS_MODE_DISABLED, "battle stays suspended below enemy card")
	escape()
	await settle()
	check(ui.enemy_window == null and ui.margin.can_process(), "second Escape returns to battle")
	check(ui.session.game == before and ui.session.combat.rng.state == rng and ui.draft == draft, "inspection preserves battle, resources, placements and RNG")
	var model = Model.new(ui.data, ui.session.combat)
	var names = ["Безымянное", "Испытанное", "Редкое", "Легендарное"]
	var colors = ["#C2BEB2", "#97B887", "#91ADD9", "#E0B76F"]
	for tier in 4:
		var template = ui.data.items.filter(func(e): return e.kind == "weapon" and int(e.tier) == tier and not e.get("unarmed", false))[0]
		var entry = model.item(template.id, enemy)
		check(entry.metadata.begins_with(names[tier] + " · Уровень 1 · "), "tier name " + str(tier))
		check(ui.data.color(entry.titleColor) == Color(colors[tier]), "tier color " + str(tier))
	check(model.item("plate", enemy).titleColor == "text-home", "armor retains its ordinary heading")
	for species_id in ["wolf", "skeleton-archer"]:
		var species = ui.data.lookup(ui.data.creatures, species_id)
		check(not species.is_empty(), "species fixture exists")
		var creature = ui.session.fighter(species.name, {"strength":3,"agility":3,"vitality":3,"intelligence":1})
		creature.creatureId = species_id
		if species_id == "skeleton-archer": creature.gear.weapon = "hunting-bow@2"
		ui.session.game.enemy = creature
		ui.session.combat.begin(ui.session.game)
		ui.show_game()
		await settle()
		ui.combat_view.header.enemy_requested.emit()
		await settle()
		window = ui.enemy_window
		check(window.profile.portrait.texture != null, "species uses its own portrait")
		if species_id == "wolf":
			check(window.profile.equipment == null, "unarmed species has no mannequin")
		else:
			check(window.profile.equipment.slots.keys() == ["weapon"], "restricted species exposes only permitted slot")
		await shot("enemy-" + species_id)
		ui._notification(Node.NOTIFICATION_WM_GO_BACK_REQUEST)
		await settle()
		check(ui.enemy_window == null and ui.margin.can_process(), "Android Back closes enemy card")
	ui.hero_id = ""
	print("ENEMY_INSPECTION: %d checks; %d failures" % [checks, failures.size()])
	quit(0 if failures.is_empty() else 1)
