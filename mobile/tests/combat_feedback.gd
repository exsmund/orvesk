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
	var animated = true
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
	check(ui.session.game.round == 2 and ui.session.game.player.hp == 24 and ui.session.game.enemy.hp == 24, "Damage committed before feedback")
	var feedback = ui.damage_feedback
	check(feedback.labels.player.text == "−6" and feedback.labels.enemy.text == "−6", "Both avatars show actual committed losses")
	check(not feedback.blocks_input, "Feedback does not block the next normal turn")
	await create_timer(0.12).timeout
	var initial_y = feedback.labels.player.position.y
	await create_timer(0.18).timeout
	check(feedback.labels.player.position.y < initial_y and feedback.labels.player.modulate.a > 0, "Damage rises visibly")
	await shot("damage-floating")
	root.size = Vector2i(896,800)
	await settle()
	check(absf(feedback.labels.enemy.get_global_rect().get_center().x - ui.combat_view.header.enemy_portrait.get_global_rect().get_center().x) < 1, "Popup follows enemy avatar when unfolding")
	await wait_feedback()
	check(not is_instance_valid(ui.damage_feedback), "Feedback finishes and frees its controls")
	ui.show_game()
	check(not is_instance_valid(ui.damage_feedback), "Rendering does not replay historical damage")
	ui.load_hero(ui.hero_id)
	check(not is_instance_valid(ui.damage_feedback), "Reloading a saved result does not replay damage")
	battle(30,30,4)
	check(resolve(), "Resolve attack with simultaneous healing")
	check(ui.session.game.player.hp == 28 and ui.damage_feedback.labels.player.text == "−6", "Popup reports damage before healing, not net HP difference")
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
	check(resolve() and not is_instance_valid(ui.damage_feedback), "No health loss means no damage popup")
	for ending in [{"hp":Vector2(30,4),"phase":"victory"},{"hp":Vector2(4,30),"phase":"defeat"},{"hp":Vector2(4,4),"phase":"draw"}]:
		battle(ending.hp.x, ending.hp.y)
		await settle()
		var old_view = ui.combat_view
		check(resolve() and ui.session.game.phase == ending.phase, "Terminal result committed: " + ending.phase)
		check(ui.combat_view == old_view and ui.damage_feedback.blocks_input, "Keep avatars visible and block repeated terminal action")
		var target = "enemy" if ending.phase == "victory" else "player"
		check(ui.damage_feedback.labels[target].text == "−4", "Lethal number capped to actual remaining health")
		check(ui.saves.read(ui.hero_id).game.phase == ending.phase, "Terminal result already saved during animation")
		await create_timer(0.20).timeout
		if ending.phase == "victory": await shot("lethal-floating")
		await wait_feedback()
		check(not is_instance_valid(ui.combat_view) and not is_instance_valid(ui.damage_feedback), "Transition to result after lethal feedback: " + ending.phase)
	# Navigating away invalidates the pending transition rather than reopening a screen.
	battle(30,4)
	resolve()
	ui.show_home()
	await wait_feedback()
	check(ui.screen == "home" and not is_instance_valid(ui.damage_feedback), "Leaving terminal animation cancels delayed screen transition")
	print("COMBAT_FEEDBACK: %s (%d checks; %d failures)" % ["PASS" if failures.is_empty() else "FAIL",checks,failures.size()])
	quit(0 if failures.is_empty() else 1)
