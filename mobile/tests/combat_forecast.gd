extends SceneTree
const ModalDialog = preload("res://ui/modal_dialog.gd")
const Details = preload("res://ui/combat_details.gd")
var checks = 0
var failures: Array = []
var ui
var output = ""

func _initialize(): call_deferred("run")

func check(condition: bool, message: String):
	checks += 1
	if not condition:
		failures.append(message)
		printerr("FAIL: " + message)

func frame():
	await process_frame
	await process_frame

func snapshot(name: String):
	await frame()
	if not output.is_empty() and DisplayServer.get_name() != "headless":
		await RenderingServer.frame_post_draw
		root.get_texture().get_image().save_png(output.path_join(name + ".png"))

func move(id: String, x: int = 0) -> Dictionary:
	return {"id": id, "x": x, "y": 0, "rotation": 0}

func touch(point: Vector2, pressed: bool):
	var event = InputEventScreenTouch.new()
	event.index = 0
	event.position = point
	event.pressed = pressed
	root.push_input(event, true)

func run():
	root.gui_embed_subwindows = true
	if not OS.get_cmdline_user_args().is_empty(): output = OS.get_cmdline_user_args()[0]
	ui = load("res://scenes/main.tscn").instantiate()
	ui.session = preload("res://tests/campaign_driver.gd").new(ui.data)
	root.add_child(ui)
	await frame()
	root.size = Vector2i(432, 1008)
	ui.session.combat.rng.seed = 172
	ui.session.create("Вереск", {"strength": 1, "agility": 1, "vitality": 1, "intelligence": 4}, ui.data.portraits[0].id)
	ui.session.travel("fight-1")
	var g = ui.session.game
	var combat = ui.session.combat
	# Small explicit fixtures make the interaction expectations independent of UI code.
	var attack = {"id": "test-hit", "name": "Проверочный удар", "category": "attack", "shape": [[0, 0]], "staminaCost": 3, "staminaDamagePerCell": 3, "healthDamage": {"base": 6, "stats": [], "types": {"blunt": 1}}}
	var guard = {"id": "test-block", "name": "Проверочный блок", "category": "defense", "shape": [[0, 0]], "blocks": true, "blockCost": 1}
	for side in ["player", "enemy"]:
		g[side].deck.hand = [attack.duplicate(true), guard.duplicate(true)]
		g[side].hp = 30
		g[side].stamina = 8
		g[side].gear = {"weapon": null, "shield": null, "body": null, "feet": null}
	g.clashPlan = {"stage": "preparation", "preparer": "player", "reactor": "enemy", "playerPlaced": [], "enemyPlaced": [move(attack.id)], "playerModifiers": {}, "enemyModifiers": {}}
	var original = JSON.stringify(g)
	var rng = combat.rng.state
	var blind = combat.forecast(g, [move(guard.id)])
	check(not blind.known and blind.calculation.is_empty(), "No forecast for secret AI response")
	check(blind.cost.remaining == 7 and blind.cells.all(func(c): return c.enemy.is_empty()), "Blind guard reserves cost without leaking enemy cells")
	check(Details.new(ui.data).cell_text(blind.cells[0]).contains("скрыта"), "Preparation explains uncertainty")
	check(JSON.stringify(g) == original and combat.rng.state == rng, "Forecast does not mutate game or RNG")
	var first = combat.forecast(g, [move(attack.id)])
	check(first.estimate.enemy.damage == 6 and first.estimate.enemy.staminaLoss == 3 and first.cells[0].previewDamage == 6, "Preparation immediately estimates unopposed damage")
	check(first.estimate.player.damage == 0 and first.cost.remaining == 5, "Blind forecast shows own cost, not hidden incoming damage")
	ui.show_game()
	ui.place_card(attack.id, 0, 0)
	check(ui.combat_view.header.bars[2].forecast_change == -6 and ui.combat_view.header.bars[2].forecast_label.text == "−6", "Placement immediately updates health forecast without approximation symbol")
	check(ui.board.damage_rows(ui.board.damage_cells[0], "enemy")[0].value == 6, "Placed attacking figure immediately displays damage")
	await snapshot("forecast-preparation")
	var concealed = g.clashPlan.enemyPlaced.duplicate(true)
	g.clashPlan.enemyPlaced = [move(guard.id)]
	check(combat.forecast(g, [move(attack.id)]) == first, "Hidden guard cannot change or leak into preparation estimate")
	g.clashPlan.enemyPlaced = concealed
	ui.remove_card(attack.id)
	check(ui.combat_view.header.bars[2].forecast_change == 0, "Removing preparation figure clears estimate immediately")
	check(JSON.stringify(g) == original and combat.rng.state == rng, "Preparation UI preserves game and RNG")
	g.clashPlan.stage = "reaction"
	g.clashPlan.preparer = "enemy"
	g.clashPlan.reactor = "player"
	var block = combat.forecast(g, [move(guard.id)])
	check(block.calculation.player.damage == 0 and block.calculation.player.staminaLoss == 0 and block.cost.remaining == 7, "Known block cancels both losses and pays one cell")
	var blocked_rows = ui.board.damage_rows(block.cells[0], "player")
	check(blocked_rows.size() == 2 and blocked_rows.all(func(row): return row.value == 0), "Blocked enemy attack keeps both zero damage counters")
	check(ui.board.damage_rows(block.cells[0], "enemy").is_empty(), "Defensive figure does not gain zero damage counters")
	check(combat.forecast(g, [move(guard.id, 1)]).cost.remaining == 8, "Unopposed block is free")
	var counter = attack.duplicate(true)
	counter.category = "defense"
	counter.counter = true
	counter.id = "test-counter"
	g.player.deck.hand.append(counter)
	var calc = combat.forecast(g, [move(counter.id)])
	check(calc.cells[0].enemyDamage == 6, "Counter uses full damage against attack")
	check(combat.forecast(g, [move(counter.id, 1)]).cells[1].enemyDamage == 0, "Counter cannot attack empty cell")
	check(ui.board.damage_rows(combat.forecast(g, [move(counter.id, 1)]).cells[1], "enemy").size() == 2, "Inactive damaging counter retains its zero counters")
	var evade = guard.duplicate(true)
	evade.erase("blocks")
	evade.evades = true
	evade.id = "test-evade"
	g.player.deck.hand.append(evade)
	calc = combat.forecast(g, [move(evade.id)])
	check(calc.cells[0].playerDamage == 0 and calc.cells[0].playerStaminaDamage == 0, "Evade cancels health and stamina loss")
	check(ui.board.damage_rows(calc.cells[0], "player").all(func(row): return row.value == 0), "Evaded attack retains zero damage")
	var health_only = attack.duplicate(true)
	health_only.id = "test-health-only"
	health_only.staminaDamagePerCell = 0
	g.player.deck.hand.append(health_only)
	g.clashPlan.enemyPlaced = [move(guard.id)]
	var blocked_hit = combat.forecast(g, [move(health_only.id)])
	var health_rows = ui.board.damage_rows(blocked_hit.cells[0], "enemy")
	check(health_rows.size() == 1 and health_rows[0].kind == "health" and health_rows[0].value == 0, "Blocked health-only hit has one zero, no stamina counter")
	g.clashPlan.enemyPlaced = [move(attack.id)]
	# Reveal always uses the committed moves, never a stale UI draft.
	g.clashPlan.stage = "reveal"
	g.clashPlan.playerPlaced = [move(guard.id)]
	check(combat.forecast(g, [move(attack.id)]).calculation.player.damage == 0, "Reveal ignores editable draft")
	g.clashPlan.stage = "reaction"
	g.clashPlan.playerPlaced = []
	ui.draft = []
	ui.show_game()
	await frame()
	var screen = ui.combat_view
	check(screen.header.bars[0].forecast_change == -6, "Health bar shows incoming damage before placing")
	check(screen.header.bars[1].forecast_change == -3, "Stamina bar shows incoming stamina damage")
	var source = screen.cards[0]
	original = JSON.stringify(g)
	rng = combat.rng.state
	screen.start_drag(attack.id, source.get_global_rect().get_center(), source)
	var point = screen.board.global_position + screen.drag_offset + Vector2(2, 2)
	screen.move_drag(point)
	check(screen.drop_valid and screen.forecast.cells[0].playerDamage == 3 and screen.forecast.cells[0].enemyDamage == 3, "Valid drag previews half-damage clash on both sides")
	check(screen.header.bars[1].displayed_value == 5 and screen.header.bars[1].forecast_change == -1.5, "Bar separates placement cost from stamina damage")
	check(screen.header.bars[2].forecast_change == -3 and screen.header.bars[3].forecast_change == -1.5, "Enemy bars use the same preview")
	check(JSON.stringify(g) == original and combat.rng.state == rng and ui.draft.is_empty(), "Dragging preview is read-only")
	await snapshot("forecast-drag")
	screen.move_drag(Vector2(-100, -100))
	check(screen.header.bars[0].forecast_change == -6 and screen.header.bars[2].forecast_change == 0, "Invalid hover returns to actual draft forecast")
	screen.end_drag(Vector2(-100, -100), true)
	check(ui.draft.is_empty() and screen.header.bars[0].forecast_change == -6, "Canceled drag resets forecast")
	ui.place_card(attack.id, 0, 0)
	check(screen.header.bars[0].forecast_change == -3, "Committed placement refreshes forecast")
	await snapshot("forecast-cover")
	var cell_point = screen.board.get_global_rect().position + Vector2.ONE * screen.board.size.x / 6
	var draft_before = ui.draft.duplicate(true)
	touch(cell_point, true)
	screen.board._process(0.51)
	touch(cell_point, false)
	await frame()
	var reports = ui.get_children().filter(func(c): return c is ModalDialog and c.visible)
	check(reports.size() == 1 and reports[0].title.begins_with("Клетка 1"), "Hold opens cell report")
	if not reports.is_empty():
		check(reports[0].report.text.contains("половина") and reports[0].report.text.contains("−3 здоровья"), "Cell report explains contact and actual losses")
		check(reports[0].size.x <= ui.size.x and reports[0].size.y <= ui.size.y, "Report fits narrow viewport")
	check(ui.draft == draft_before, "Inspecting cell never removes or rotates figure")
	await snapshot("forecast-cell")
	root.size = Vector2i(896, 800)
	await frame()
	check(ui.draft == draft_before and ui.combat_view == screen and screen.forecast.cells[0].playerDamage == 3, "Unfold preserves placement and preview")
	if not reports.is_empty(): check(reports[0].size.x <= ui.size.x and reports[0].size.y <= ui.size.y, "Report adapts on unfold")
	ui._notification(Control.NOTIFICATION_WM_GO_BACK_REQUEST)
	await frame()
	check(ui.screen == "game" and ui.get_children().filter(func(c): return c is ModalDialog and c.visible).is_empty(), "Back closes only cell report")
	await snapshot("forecast-inner")
	ui.remove_card(attack.id)
	check(screen.header.bars[2].forecast_change == 0, "Removing figure clears outgoing damage preview")
	# A lethal multi-cell hit is capped and its rounded cells still sum exactly.
	var heavy = attack.duplicate(true)
	heavy.shape = [[0, 0], [1, 0]]
	g.player.deck.hand = [heavy]
	g.enemy.hp = 0.7
	g.enemy.stamina = 0.5
	g.clashPlan.enemyPlaced = []
	calc = combat.forecast(g, [move(heavy.id)]).calculation
	check(is_equal_approx(calc.cells[0].enemyDamage, 0.4) and is_equal_approx(calc.cells[1].enemyDamage, 0.3), "Lethal damage allocated in tenths, stable tie order")
	check(is_equal_approx(calc.enemy.staminaLoss, 0.5) and is_equal_approx(calc.cells[0].enemyStaminaDamage + calc.cells[1].enemyStaminaDamage, 0.5), "Stamina cells capped after costs")
	# Resolved details survive hand replacement and save/reload; old logs are kept.
	g.enemy.hp = 30
	g.enemy.stamina = 8
	g.clashPlan.enemyPlaced = [move(attack.id)]
	var expected = combat.forecast(g, [move(heavy.id)]).calculation
	check(ui.session.submit([move(heavy.id)]).is_empty(), "Resolve inspected turn")
	check(g.log[0].summary.cells == expected.cells, "Saved cells exactly match the forecast")
	var record = g.log[0].duplicate(true)
	var id = "forecast-test-" + Crypto.new().generate_random_bytes(8).hex_encode()
	check(ui.saves.write(id, ui.session), "Write detailed result to test save")
	var loaded = ui.saves.read(id)
	check(not loaded.is_empty() and loaded.game.log[0].summary.cells[0].player.name == heavy.name, "Cell snapshot survives save/reload and deck changes")
	var legacy = record.duplicate(true)
	legacy.summary.erase("cells")
	check(Details.new(ui.data).result_text(legacy).contains("старой версией"), "Older summary remains readable without invented cells")
	ui.show_game()
	ui.show_last_clash_details()
	await snapshot("forecast-result")
	for suffix in ["", ".bak", ".tmp"]:
		if FileAccess.file_exists(ui.saves.path(id) + suffix): DirAccess.remove_absolute(ui.saves.path(id) + suffix)
	print("COMBAT_FORECAST: %s (%d checks; %d failures)" % ["PASS" if failures.is_empty() else "FAIL", checks, failures.size()])
	quit(0 if failures.is_empty() else 1)
