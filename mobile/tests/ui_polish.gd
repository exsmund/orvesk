extends SceneTree
const Fixtures = preload("res://tests/inspection.gd")
const Model = preload("res://ui/inspection_model.gd")
var ui
var output = ""
var checks = 0
var failures: Array = []
func _initialize(): call_deferred("run")
func check(ok: bool, text: String):
	checks += 1
	if not ok: failures.append(text); printerr("FAIL: " + text)
func settle():
	for _i in 10: await process_frame
func shot(name: String):
	await settle()
	if output and DisplayServer.get_name() != "headless":
		RenderingServer.force_draw(false)
		root.get_texture().get_image().save_png(output.path_join(name + ".png"))
func run():
	if not OS.get_cmdline_user_args().is_empty(): output = OS.get_cmdline_user_args()[0]
	root.size = Vector2i(480, 900)
	ui = load("res://scenes/main.tscn").instantiate()
	ui.session = preload("res://tests/campaign_driver.gd").new(ui.data)
	ui.saves = Fixtures.MemorySaves.new()
	ui.preferences = Fixtures.MemoryPreferences.new()
	root.add_child(ui)
	await settle()
	var s = ui.session
	s.combat.rng.seed = 61
	s.create("Зая", {"strength":3,"agility":2,"vitality":1,"intelligence":1}, ui.data.portraits[0].id)
	ui.hero_id = "polish"
	var model = Model.new(ui.data, s.combat)
	var sample = {"id":"sample", "name":"Тест", "category":"attack", "shape":[[0,0]], "staminaCost":2, "healthDamage":{"base":17,"stats":[],"types":{"pierce":1}}}
	var concise = model.figure_runs(s.game.player, sample)[0]
	check(concise.prefix + concise.result == "Колющий урон = 17 × 1", "normal damage label has only type and result")
	s.game.player.gear.weapon = "dagger"
	ui.show_game()
	ui.show_item_details("dagger")
	await settle()
	check(not ui.inspection_window.cards[0].figure_rows[0].detailed, "hero equipment omits arithmetic")
	ui.inspection_window.close()
	ui.show_catalog_entry("dagger", false)
	await settle()
	check(ui.inspection_window.cards[0].figure_rows[0].detailed, "debug equipment catalog includes arithmetic")
	ui.inspection_window.close()
	ui.show_skill_catalog_entry("dodge")
	await settle()
	check(not ui.inspection_window.cards[0].figure_rows[0].detailed, "debug skill catalog still uses concise labels")
	ui.inspection_window.close()
	var enabled = ProjectSettings.get_setting("features/debug_tools")
	ProjectSettings.set_setting("features/debug_tools", false)
	ui.open_inspection([[model.item("dagger", s.game.player)]], {"show_formulas":true})
	await settle()
	check(not ui.inspection_window.cards[0].figure_rows[0].detailed, "flag independently gates detailed formulas")
	ui.inspection_window.close()
	ProjectSettings.set_setting("features/debug_tools", enabled)
	ui.open_inspection(model.item_comparison("shortsword", s.game.player, true), {"title":"Сравнение оружия"})
	await settle()
	var offered = ui.inspection_window.cards[0]
	var owned = ui.inspection_window.cards[1]
	check(offered.entry.status == "Новое" and owned.entry.status == "У вас", "comparison badges renamed")
	check(offered.get_child(0).get_theme_stylebox("panel").border_color == ui.data.color("border-action-figures"), "new item badge is green")
	check(owned.get_child(0).get_theme_stylebox("panel").border_color == ui.data.color("border-journey-map-2-2"), "owned badge is ochre")
	await shot("comparison")
	ui.inspection_window.close()
	# Use an explicit one-cell card to test a real over-budget placement.
	s.fight_fixture(1)
	s.game.player.deck.hand = [sample.duplicate(true)]
	s.game.player.stamina = 1
	s.game.clashPlan.stage = "reaction"
	s.game.clashPlan.preparer = "enemy"
	s.game.clashPlan.reactor = "player"
	s.game.clashPlan.enemyPlaced = []
	s.game.clashPlan.playerPlaced = []
	ui.show_game()
	await settle()
	check(ui.combat_view.action.disabled and not ui.combat_view.skip.disabled, "only skip available for empty low-stamina turn")
	ui.place_card(sample.id, 0, 0)
	await create_timer(0.10).timeout
	var bar = ui.combat_view.header.bars[1]
	check(bar.scale.x > 1.02 and bar.shortage_strength > 0 and bar.value_label.text.begins_with("-1"), "insufficient placement pulses full stamina bar and numbers")
	check(ui.combat_view.action.disabled and ui.combat_view.skip.disabled, "over-budget placement blocks both actions")
	await shot("stamina-pulse")
	ui.place_card(sample.id, 1, 0)
	await create_timer(0.65).timeout
	check(bar.scale.is_equal_approx(Vector2.ONE) and is_zero_approx(bar.shortage_strength), "repeated pulses finish at original size")
	ui.remove_card(sample.id)
	check(not ui.combat_view.skip.disabled and ui.combat_view.action.disabled, "removing final figure restores skip-only state")
	s.game.player.stamina = ui.data.max_stamina(s.game.player)
	ui.combat_view.refresh()
	check(ui.combat_view.skip.disabled and not ui.combat_view.action.disabled, "full stamina keeps ordinary action reachable")
	# A genuine loss records the location before the chapter reset and its dialogue.
	s.fight_fixture(4)
	s.game.souls = 23
	s.game.player.hp = 0
	s.game.phase = "defeat"
	s.finish_battle()
	ui.show_game()
	ui.act(s.campaign.start_defeat)
	check(s.game.phase == "story" and not is_instance_valid(ui.journey_view), "defeat dialogue precedes map return")
	await shot("dialogue-shadow")
	for _step in 150:
		if s.game.phase != "story": break
		var node = s.campaign.node()
		var options = s.campaign.options()
		ui.act(func(): return s.story_advance(node.id, options[0] if not options.is_empty() else ""))
	await settle()
	var view = ui.journey_view
	check(is_instance_valid(view) and view.returning, "map return starts after all dialogue")
	check(s.game.journey.returnFromDefeat.nodeId == "fight-4" and s.current_node() == "camp-start", "loss receipt survives reset to camp")
	var before = s.game.duplicate(true)
	var rng = s.combat.rng.state
	check(view.map_view.shard_badge.visible and view.map_view.shard_badge.amount == 23, "lost shards shown by defeating enemy")
	var defeated_center = view.map_view.centers["fight-4"] - Vector2(view.map_scroll.scroll_horizontal, view.map_scroll.scroll_vertical)
	check(defeated_center.distance_to(view.map_scroll.size / 2) < 2, "return starts centered on defeating enemy")
	check(view.map_view.markers.values().all(func(m): return m.disabled), "map destinations disabled while returning")
	await shot("return-enemy")
	await create_timer(1.1).timeout
	check(view.return_progress > 0 and view.return_progress < 1, "rewind moves gradually")
	await shot("return-midway")
	await create_timer(1.6).timeout
	await settle()
	check(not view.returning and is_equal_approx(view.return_progress, 1), "rewind completes")
	var camp_center = view.map_view.centers["camp-start"] - Vector2(view.map_scroll.scroll_horizontal, view.map_scroll.scroll_vertical)
	check(camp_center.distance_to(view.map_scroll.size / 2) < 2, "rewind finishes centered on starting camp")
	check(view.map_view.markers.values().all(func(m): return not m.disabled), "map interaction restored")
	check(s.game == before and s.combat.rng.state == rng, "camera animation changes neither game nor RNG")
	await shot("return-camp")
	ui.show_game()
	await settle()
	check(not ui.journey_view.returning, "same return not replayed when reopening map")
	# A later loss with no shards still rewinds, but has no stale cache badge.
	s.fight_fixture(2)
	s.game.souls = 0
	s.game.player.hp = 0
	s.game.phase = "defeat"
	s.finish_battle()
	s.game.story.attempt += 1
	s.reset_chapter()
	ui.show_game()
	await settle()
	check(ui.journey_view.returning and not ui.journey_view.map_view.shard_badge.visible, "zero-shard loss rewinds without a counter")
	ui.hero_id = ""
	print("UI_POLISH: %d checks; %d failures" % [checks, failures.size()])
	quit(0 if failures.is_empty() else 1)
