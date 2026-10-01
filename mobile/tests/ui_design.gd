extends SceneTree
const ModalDialog = preload("res://ui/modal_dialog.gd")
const TextMenuButton = preload("res://ui/menu_button.gd")
const DifficultyOption = preload("res://ui/difficulty_option.gd")
const OptionCheckbox = preload("res://ui/option_checkbox.gd")
const SquareButton = preload("res://ui/square_button.gd")
const WindowActions = preload("res://ui/window_actions.gd")
## Interaction/state regressions for the shared visual system; no real saves are touched.
var ui
var failures: Array = []
var checks = 0
var output = ""

func _initialize(): call_deferred("run")

func check(ok: bool, message: String):
	checks += 1
	if not ok:
		failures.append(message)
		printerr("FAIL: " + message)

func settle():
	for _frame in 8: await process_frame

func shot(name: String):
	await settle()
	if output and DisplayServer.get_name() != "headless":
		await RenderingServer.frame_post_draw
		root.get_texture().get_image().save_png(output.path_join(name + ".png"))

func check_buttons(node):
	if node is Button and not node is CheckButton:
		if node is DifficultyOption or node is OptionCheckbox:
			check(node.get_theme_stylebox("normal") is StyleBoxEmpty, "Shared selection control has its own indicator")
		elif node is TextMenuButton:
			check(node.get_theme_stylebox("normal") is StyleBoxEmpty, "Shared text menu component")
		elif node is SquareButton:
			check(node.get_theme_stylebox("normal").texture == SquareButton.NORMAL, "Shared square button skin")
		elif is_instance_valid(ui.home_view) and node.get_parent() == ui.home_view:
			check(node.get_theme_stylebox("normal") is StyleBoxEmpty, "Home has text-only buttons")
		elif node.get_parent() is WindowActions and node == node.get_parent().back:
			check(node.get_theme_stylebox("normal") is StyleBoxEmpty, "Shared footer secondary action is text-only")
		else:
			check(node.get_theme_stylebox("normal") == ui.theme.get_stylebox("normal", "Button"), "Shared button skin: " + node.text)
	for child in node.get_children(): check_buttons(child)

func run():
	root.gui_embed_subwindows = true
	if not OS.get_cmdline_user_args().is_empty(): output = OS.get_cmdline_user_args()[0]
	ui = load("res://scenes/main.tscn").instantiate()
	ui.session = preload("res://tests/campaign_driver.gd").new(ui.data)
	root.add_child(ui)
	await settle()
	ui.session.combat.rng.seed = 43
	ui.session.create("Зая", {"strength": 1, "agility": 1, "vitality": 1, "intelligence": 4}, ui.data.portraits[0].id)
	ui.session.game.souls = 125
	ui.session.game.journey.mapPreset = "forest"
	ui.show_game()
	await settle()
	var journey = ui.journey_view
	var before = JSON.stringify(ui.session.game)
	var rng = ui.session.combat.rng.state
	journey.map_view.markers["fight-5"].pressed.emit()
	check(journey.selected == "fight-5" and journey.action.disabled, "Future destinations inspectable but not enterable")
	journey.action.pressed.emit()
	check(JSON.stringify(ui.session.game) == before, "Disabled route cannot advance even on emitted action")
	journey.map_view.markers["fight-1"].pressed.emit()
	check(not journey.action.disabled and JSON.stringify(ui.session.game) == before, "Selection waits for explicit travel")
	check(journey.map_view.markers.size() == ui.session.game.journey.map.nodes.size(), "All and only saved route nodes drawn")
	for pixels in [Vector2i(432,1008), Vector2i(896,800), Vector2i(800,896), Vector2i(1008,432), Vector2i(320,640), Vector2i(432,1008)]:
		root.size = pixels
		await settle()
		check(ui.journey_view == journey and journey.selected == "fight-1", "Folding keeps selection and view")
		check(not ui.scroll.visible, "Map has no screen scrolling")
		var area = journey.get_global_rect().grow(1)
		for control in [journey.header, journey.title, journey.detail, journey.action]:
			check(area.encloses(control.get_global_rect()), "Map component fits %s: %s" % [pixels, control.get_class()])
		for marker in journey.map_view.markers.values():
			check(journey.map_view.get_global_rect().grow(1).encloses(marker.get_global_rect()), "Route marker fits map")
		check(journey.map_scroll.clip_contents, "Scrollable world stays clipped behind the overlay panel")
	check(JSON.stringify(ui.session.game) == before and ui.session.combat.rng.state == rng, "Map rendering/selection/folding preserve saved state and RNG")
	var counter = journey.header.shards
	check(counter.amount == 125 and not journey.header.enemy_portrait.visible, "Journey header replaces enemy with shards")
	if DisplayServer.get_name() != "headless":
		check(counter.icon_rect.size.y > 0 and is_equal_approx(counter.icon_rect.size.y, counter.number_rect.size.y * counter.icon_scale) and is_equal_approx(counter.icon_rect.get_center().y, counter.number_rect.get_center().y), "Visible shard icon is slightly taller and vertically centered")
		check(counter.icon_rect.position.x > counter.number_rect.end.x, "Counter order is number then icon")
	await shot("journey-cover")
	journey.action.pressed.emit()
	check(ui.session.game.phase == "combat", "Travel action starts the selected fight")
	var deck = ui.session.combat.build_deck(ui.session.game.player)
	ui.session.game.player.deck.hand = [deck[3], deck[8], deck[5], deck[0]]
	ui.show_game()
	await settle()
	var combat = ui.combat_view
	check(not combat.status.visible and not combat.status.text.contains("После оплаты"), "No redundant payment caption")
	for bar in combat.header.bars:
		check(bar.label.get_global_rect().end.y <= bar.track.get_global_rect().position.y + 1, "Resource captions above track")
	for i in 4:
		check(is_equal_approx(combat.cards[i].cell_pitch, combat.cards[0].cell_pitch), "Uniform hand tile scale")
	var old_pitch = combat.cards[0].cell_pitch
	ui.rotate_card(combat.cards[0].card_id)
	check(is_equal_approx(combat.cards[0].cell_pitch, old_pitch), "Rotation keeps scale")
	ui.place_card(combat.cards[0].card_id, 0, 0)
	ui.place_card(combat.cards[2].card_id, 6, 0)
	await shot("combat-cover")
	before = JSON.stringify(ui.session.game)
	var draft = ui.draft.duplicate(true)
	root.size = Vector2i(896,800)
	await shot("combat-inner")
	check(ui.draft == draft and JSON.stringify(ui.session.game) == before, "Styled combat folding preserves draft/state")
	check_buttons(ui)
	ui.show_character()
	check_buttons(ui)
	root.size = Vector2i(432,1008)
	await shot("hero-cover")
	ui.show_info("Блок руками", "Блокирует входящий урон. Защита расходует силы за перекрытые клетки.")
	await shot("description-cover")
	for dialog in ui.get_children():
		if dialog is ModalDialog:
			check(dialog.panel.size.x <= ui.size.x - 32 and dialog.panel.size.y <= ui.size.y - 36, "Description remains bounded by the viewport")
	check_buttons(ui)
	for child in ui.get_children():
		if child is ModalDialog: child.queue_free()
	ui.session.game.phase = "victory"
	ui.session.finish_battle()
	ui.show_game()
	check_buttons(ui)
	await shot("rewards-cover")
	ui.session.reward(0)
	if ui.session.game.get("victoryReward", {}).get("progressionPending", false): ui.session.complete_reward()
	ui.show_game()
	ui.journey_view.select_node("camp-1")
	before = JSON.stringify(ui.session.game)
	await shot("camp-selected")
	check(JSON.stringify(ui.session.game) == before, "Camp selection does not heal or travel")
	ui.journey_view.action.pressed.emit()
	check(ui.session.current_node() == "camp-1" and ui.session.game.player.hp == ui.data.max_hp(ui.session.game.player), "Confirmed camp transition heals normally")
	# Find a generated forge, retaining its actual saved topology.
	var forge = {}
	for seed_value in range(1, 15):
		ui.session.combat.rng.seed = seed_value
		ui.session.map_fixture(1)
		for node in ui.session.game.journey.map.nodes:
			if node.kind == "forge": forge = node; break
		if not forge.is_empty(): break
	check(not forge.is_empty(), "Forge fixture available")
	ui.session.game.journey.path = [forge.id]
	ui.session.game.journey.awaitingFirstBattle = false
	ui.session.game.journey.forgeResolved = false
	# Use a real usable item from the catalog instead of depending on an equipment ID.
	ui.session.game.journey.offers = [ui.data.items.filter(func(item): return item.slot == "weapon" and not item.get("unarmed", false))[0].id]
	ui.session.service_fixture(forge, ui.session.game.journey.offers)
	ui.show_game()
	check(ui.scroll.visible and not is_instance_valid(ui.journey_view), "Unresolved forge opens equipment choices")
	check_buttons(ui)
	await shot("forge-cover")
	var offers_view = ui.forge_view
	check(offers_view.heading.text == "Кузница" and offers_view.choice_hint.text == "Можно выбрать только один предмет", "Forge uses requested title and choice hint")
	check(offers_view.illustration.texture != null and offers_view.illustration.texture.get_image().get_pixel(0, 0).a < 0.01, "Forge illustration has a transparent source")
	before = JSON.stringify(ui.session.game)
	rng = ui.session.combat.rng.state
	for pixels in [Vector2i(320,640), Vector2i(480,960), Vector2i(480,1600), Vector2i(1008,432), Vector2i(2240,900)]:
		root.size = pixels
		await settle()
		check(offers_view.surface.size.y <= 920 and is_equal_approx(offers_view.surface.get_global_rect().end.y, ui.scroll.get_global_rect().end.y), "Result frame is height-limited and bottom-aligned")
		check(offers_view.surface.get_global_rect().encloses(offers_view.canvas.get_global_rect()), "Result content stays inside the limited frame")
		check(is_equal_approx(offers_view.size.x, ui.page_header_view.size.x), "Forge frame shares header width")
		var area = offers_view.canvas.get_global_rect().grow(1)
		for node in [offers_view.illustration, offers_view.heading, offers_view.choice_hint, offers_view.divider, offers_view.rewards, offers_view.skip_button]:
			check(area.encloses(node.get_global_rect()), "Forge content stays in its frame: " + str(pixels))
		check(offers_view.rewards.get_global_rect().end.y < offers_view.skip_button.global_position.y, "Forge offers do not overlap skip action")
		await shot("forge-%dx%d" % [pixels.x, pixels.y])
	check(JSON.stringify(ui.session.game) == before and ui.session.combat.rng.state == rng, "Forge layout preserves offers, game state and RNG")
	check(ui.act(ui.session.forge), "Forge can be skipped")
	check(is_instance_valid(ui.journey_view), "Resolved forge returns to route")
	ui.show_character(3)
	ui.character_window.pages[3].show_rules()
	await shot("rules-cover")
	ui._notification(Node.NOTIFICATION_WM_GO_BACK_REQUEST)
	ui.start_create()
	check_buttons(ui)
	await shot("create-cover")
	ui.show_home()
	check_buttons(ui)
	await shot("home-cover")
	print("UI_DESIGN: %s (%d checks; %d failures)" % ["PASS" if failures.is_empty() else "FAIL", checks, failures.size()])
	quit(0 if failures.is_empty() else 1)
