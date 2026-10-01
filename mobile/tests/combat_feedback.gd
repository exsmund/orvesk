extends SceneTree
## Committed damage only; no real saves/preferences. Optional native screenshots.
var ui
var failures: Array = []
var checks = 0
var output = ""
class MemorySaves extends RefCounted:
	var error = "Сохранение недоступно"
	var fail = false
	var records = {}
	func list_heroes(): return []
	func write(id, session, draft):
		if fail: return false
		records[id] = {"format":1,"game":session.game.duplicate(true),"rngState":str(session.combat.rng.state),"draft":draft.duplicate(true)}
		return true
	func read(id): return records.get(id, {}).duplicate(true)
class MemoryPreferences extends RefCounted:
	var completed_difficulties: Array = []
	func record_completed(ids):
		for id in ids:
			if id not in completed_difficulties: completed_difficulties.append(id)
		return true
	var last_hero = ""
	func write(): return true
func _initialize(): call_deferred("run")
func check(value: bool, message: String):
	checks += 1
	if not value:
		failures.append(message)
		printerr("FAIL: " + message)
func settle():
	for _i in 5: await process_frame
func shot(name: String):
	await settle()
	if output and DisplayServer.get_name() != "headless":
		RenderingServer.force_draw(false)
		root.get_texture().get_image().save_png(output.path_join(name + ".png"))
func move(x: int): return {"id":"feedback-hit","x":x,"y":0,"rotation":0}
func battle(player_hp: float = 30, enemy_hp: float = 30, healing: float = 0):
	ui.session.combat.rng.seed = 172
	ui.session.create("Вереск", {"strength":1,"agility":1,"vitality":1,"intelligence":4},ui.data.portraits[0].id)
	ui.hero_id = "feedback-memory"
	ui.session.travel("fight-1")
	var g = ui.session.game
	var attack = {"id":"feedback-hit","name":"Удар кулаком","category":"attack","shape":[[0,0]],"staminaCost":1,"staminaDamagePerCell":0,"healthDamage":{"base":6,"stats":[],"types":{"blunt":1}},"art":ui.data.base[0].get("art", ""),"templateId":"base:"+ui.data.base[0].id}
	for side in ["player","enemy"]:
		g[side].deck.hand = [attack.duplicate(true)]
		g[side].hp = player_hp if side == "player" else enemy_hp
		g[side].stamina = 8
		g[side].gear = {"weapon":null,"shield":null,"body":null,"feet":null,"ring":null,"amulet":null}
	g.player.deck.hand[0].healing = healing
	g.clashPlan = {"stage":"reaction","preparer":"enemy","reactor":"player","playerPlaced":[],"enemyPlaced":[move(1)],"playerModifiers":{},"enemyModifiers":{}}
	ui.draft = []
	ui.show_game()
func resolve():
	return ui.act(func(): return ui.session.submit([move(0)]))
func wait_feedback():
	await create_timer(1.15).timeout
	await settle()

func run():
	root.gui_embed_subwindows = true
	root.size = Vector2i(560,1000)
	if not OS.get_cmdline_user_args().is_empty(): output = OS.get_cmdline_user_args()[0]
	ui = load("res://scenes/main.tscn").instantiate()
	ui.session = preload("res://tests/campaign_driver.gd").new(ui.data)
	ui.saves = MemorySaves.new()
	ui.preferences = MemoryPreferences.new()
	root.add_child(ui)
	battle()
	await settle()
	ui.place_card("feedback-hit",0,0)
	check(not is_instance_valid(ui.damage_feedback), "Planning never plays a received-damage animation")
	var before = ui.session.game.duplicate(true)
	var draft = ui.draft.duplicate(true)
	ui.saves.fail = true
	check(not resolve(), "Failed write rejects the resolved turn")
	check(ui.session.game == before and ui.draft == draft and not is_instance_valid(ui.damage_feedback), "Rollback leaves no phantom damage popups")
	ui.saves.fail = false
	check(resolve(), "Successful turn resolves")
	check(ui.session.game.round == 2 and is_equal_approx(ui.session.game.player.hp, 25.8) and ui.session.game.enemy.hp == 24, "Damage committed before feedback")
	var feedback = ui.damage_feedback
	check(feedback.labels.player.text == "−4.2" and feedback.labels.enemy.text == "−6", "Both avatars show actual committed losses")
	check(feedback.blocks_input and ui.combat_view.transition_busy and ui.combat_view.action.disabled and ui.combat_view.skip.disabled, "Result pauses and locks actions")
	check(not ui.act(func(): return ui.session.submit([])), "Repeated submission is blocked during result")
	await create_timer(0.12).timeout
	var initial_y = feedback.labels.player.position.y
	await create_timer(0.18).timeout
	check(feedback.labels.player.position.y < initial_y and feedback.labels.player.modulate.a > 0, "Damage rises visibly")
	await shot("damage-floating")
	root.size = Vector2i(896,800)
	await settle()
	check(absf(feedback.labels.enemy.get_global_rect().get_center().x - ui.combat_view.header.enemy_portrait.get_global_rect().get_center().x) < 1, "Popup follows enemy avatar when unfolding")
	await feedback.finished
	await settle()
	check(not is_instance_valid(ui.damage_feedback), "Feedback finishes and frees its controls")
	check(ui.combat_view.dealing and ui.combat_view.cards.all(func(c): return not c.interactive), "New hand flies in with dragging blocked")
	var dealt_view = ui.combat_view
	var first = dealt_view.cards[0]
	dealt_view.start_drag(first.card_id, first.global_position, first)
	check(dealt_view.drag_id.is_empty(), "Direct drag is rejected during deal")
	await create_timer(0.7).timeout
	check(not dealt_view.transition_busy and not dealt_view.dealing and dealt_view.cards.all(func(c): return c.interactive), "Deal restores interaction")
	ui.show_game()
	check(not is_instance_valid(ui.damage_feedback), "Rendering does not replay historical damage")
	ui.load_hero(ui.hero_id)
	check(not is_instance_valid(ui.damage_feedback), "Reloading a saved result does not replay damage")
	battle(30,30,4)
	check(resolve(), "Resolve attack with simultaneous healing")
	check(is_equal_approx(ui.session.game.player.hp, 29.8) and ui.damage_feedback.labels.player.text == "−4.2", "Popup reports damage before healing, not net HP difference")
	ui.show_game()
	battle()
	ui.session.game.clashPlan.preparer = "player"
	ui.session.game.clashPlan.reactor = "enemy"
	ui.session.game.clashPlan.stage = "preparation"
	ui.session.game.clashPlan.enemyPlaced = []
	ui.combat_view.refresh()
	check(resolve(), "First submit reveals reply")
	check(ui.session.game.clashPlan.stage == "reveal" and not is_instance_valid(ui.damage_feedback), "Revealing placements causes no damage animation")
	# Zero health damage must not spawn '-0', even when stamina or healing changes.
	battle()
	for side in ["player","enemy"]: ui.session.game[side].deck.hand[0].healthDamage.base = 0
	check(resolve() and ui.damage_feedback.labels.is_empty() and ui.combat_view.shake_offset == Vector2.ZERO, "Zero damage still pauses without popup or shake")
	for ending in [{"hp":Vector2(30,4),"phase":"victory"},{"hp":Vector2(3,30),"phase":"defeat"},{"hp":Vector2(3,4),"phase":"draw"}]:
		battle(ending.hp.x, ending.hp.y)
		await settle()
		var old_view = ui.combat_view
		check(resolve() and ui.session.game.phase == ending.phase, "Terminal result committed: " + ending.phase)
		check(ui.combat_view == old_view and ui.damage_feedback.blocks_input, "Keep avatars visible and block repeated terminal action")
		var target = "enemy" if ending.phase == "victory" else "player"
		check(ui.damage_feedback.labels[target].text == ("−4" if target == "enemy" else "−3"), "Lethal number capped to actual remaining health")
		check(ui.saves.read(ui.hero_id).game.phase == ending.phase, "Terminal result already saved during animation")
		await create_timer(0.20).timeout
		if ending.phase == "victory": await shot("lethal-floating")
		await wait_feedback()
		check(not is_instance_valid(ui.combat_view) and not is_instance_valid(ui.damage_feedback), "Transition to result after lethal feedback: " + ending.phase)
	# Surviving hand copies keep their slots and do not fly again. A recycled played
	# copy with the same ID is newly drawn, so ID membership alone is insufficient.
	battle()
	var survivor = ui.session.game.player.deck.hand[0].duplicate(true)
	survivor.id = "survivor"
	ui.session.game.player.deck.hand.append(survivor)
	ui.session.game.player.deck.draw = []
	ui.session.game.player.deck.discard = []
	ui.show_game()
	await settle()
	var survivor_slot = ui.combat_view.hand_slots.survivor
	var survivor_position = ui.combat_view.cards[1].position
	ui.place_card("feedback-hit", 0, 0)
	check(ui.combat_view.cards[1].position == survivor_position, "Placing another figure leaves survivor in its slot")
	check(resolve(), "Resolve with retained hand and recycled copy")
	await ui.damage_feedback.finished
	await settle()
	var next_view = ui.combat_view
	var kept = next_view.cards.filter(func(c): return c.card_id == "survivor")[0]
	check(next_view.hand_slots.survivor == survivor_slot and kept.position == survivor_position, "Retained card does not move during draw")
	check(next_view.deal_order == ["feedback-hit"], "Only drawn copy animates, including recycled ID")
	await create_timer(0.4).timeout
	check(not next_view.dealing and not next_view.transition_busy, "One-card draw unlocks on completion")
	next_view.animate_deal(next_view.hand_slots.duplicate())
	check(not next_view.dealing and not next_view.transition_busy, "No draw means no animation or lock")
	next_view.press_board()
	await create_timer(0.06).timeout
	check(next_view.board.scale.x < 1 and next_view.press_depth > 0, "Successful drop depresses the board")
	await create_timer(0.25).timeout
	check(next_view.board.scale == Vector2.ONE and is_zero_approx(next_view.press_depth), "Board returns to exact resting transform")
	# Navigating away invalidates the pending transition rather than reopening a screen.
	battle(30,4)
	resolve()
	ui.show_home()
	await wait_feedback()
	check(ui.screen == "home" and not is_instance_valid(ui.damage_feedback), "Leaving terminal animation cancels delayed screen transition")
	print("COMBAT_FEEDBACK: %s (%d checks; %d failures)" % ["PASS" if failures.is_empty() else "FAIL",checks,failures.size()])
	quit(0 if failures.is_empty() else 1)
