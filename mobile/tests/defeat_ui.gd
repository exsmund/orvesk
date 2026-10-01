extends SceneTree
const Fixtures = preload("res://tests/inspection.gd")
var ui
var checks = 0
var failures: Array = []
var output = ""

func _initialize(): call_deferred("run")
func check(ok: bool, text: String):
	checks += 1
	if not ok: failures.append(text); printerr("FAIL: " + text)
func settle():
	for _i in 10: await process_frame
func shot(name: String):
	if output and DisplayServer.get_name() != "headless":
		RenderingServer.force_draw(false)
		root.get_texture().get_image().save_png(output.path_join(name + ".png"))

func run():
	if not OS.get_cmdline_user_args().is_empty(): output = OS.get_cmdline_user_args()[0]
	ui = load("res://scenes/main.tscn").instantiate()
	ui.session = preload("res://tests/campaign_driver.gd").new(ui.data)
	ui.saves = Fixtures.MemorySaves.new()
	ui.preferences = Fixtures.MemoryPreferences.new()
	root.add_child(ui)
	await settle()
	var s = ui.session
	s.combat.rng.seed = 61
	s.create("Зая", {"strength":3,"agility":2,"vitality":1,"intelligence":1}, ui.data.portraits[0].id)
	ui.hero_id = "defeat-ui-memory-only"
	s.fight_fixture(4)
	s.game.player.hp = 0
	s.game.enemy.hp = 12
	s.game.enemy.stamina = 3
	s.game.souls = 23
	s.game.phase = "defeat"
	s.finish_battle()
	ui.show_game()
	await settle()
	var view = ui.defeat_view
	var header = ui.page_header_view
	check(not header.journey_mode and header.enemy_portrait.visible and header.enemy_bars.visible and not header.shards.visible, "defeat uses combat header")
	check(header.bars[0].displayed_value == 0 and header.bars[2].displayed_value == 12 and header.bars[3].displayed_value == 3, "header keeps actual post-battle resources")
	check(view.illustration.texture != null and view.message.text == "Осколки остались у противника", "defeat illustration and lost-shards explanation")
	var before = s.game.duplicate(true)
	var rng = s.combat.rng.state
	for pixels in [Vector2i(320,640), Vector2i(480,960), Vector2i(480,1600), Vector2i(1008,432), Vector2i(2240,900)]:
		root.size = pixels
		await settle()
		var bounds = view.canvas.get_global_rect().grow(1)
		for node in [view.illustration, view.title, view.divider, view.message, view.detail, view.restart_button]:
			check(bounds.encloses(node.get_global_rect()), "defeat content fits window " + str(pixels))
		check(ui.scroll.get_global_rect().grow(1).encloses(view.restart_button.get_global_rect()), "restart remains visible")
		check(view.detail.get_global_rect().end.y < view.restart_button.global_position.y, "explanation does not overlap action")
		check(is_equal_approx(view.size.x, header.size.x), "result window shares header width")
		check(view.surface.size.y <= 920 and is_equal_approx(view.surface.get_global_rect().end.y, ui.scroll.get_global_rect().end.y), "Result frame is height-limited and bottom-aligned")
		check(view.surface.get_global_rect().encloses(view.canvas.get_global_rect()), "Result content stays inside the limited frame")
		var block = view.illustration.get_global_rect().merge(view.restart_button.get_global_rect())
		check(absf(block.get_center().y - view.canvas.get_global_rect().get_center().y) < 1, "defeat content remains vertically centered")
		shot("defeat-%dx%d" % [pixels.x, pixels.y])
	check(s.game == before and s.combat.rng.state == rng, "resize does not change result or RNG")
	header.enemy_portrait.pressed.emit()
	await settle()
	check(is_instance_valid(ui.enemy_window), "enemy portrait opens its equipment after defeat")
	ui.enemy_window.close()
	ui.refresh_character_header()
	check(not header.journey_mode and header.enemy_portrait.visible, "character refresh preserves combat header")
	ui.saves.fail = true
	view.restart_button.pressed.emit()
	await settle()
	check(s.game == before and s.combat.rng.state == rng and is_instance_valid(ui.defeat_view), "failed save keeps defeat and can retry")
	ui.saves.fail = false
	ui.defeat_view.restart_button.pressed.emit()
	await settle()
	check(s.game.phase == "ready" and s.current_node() == "camp-start", "restart passes through campaign to start camp")
	check(s.game.journey.lostSouls.amount == 23 and ui.journey_view.returning, "restart preserves lost shards and map rewind")
	s.fight_fixture(2)
	s.game.souls = 0
	s.game.player.hp = 0
	s.game.phase = "defeat"
	s.finish_battle()
	ui.show_game()
	await settle()
	check(ui.defeat_view.message.text == "Путь ещё не окончен", "no false lost-shards claim when balance was zero")
	ui.hero_id = ""
	print("DEFEAT_UI: %d checks; %d failures" % [checks, failures.size()])
	quit(0 if failures.is_empty() else 1)
