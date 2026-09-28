extends SceneTree
const InspectionWindow = preload("res://ui/inspection_window.gd")
var ui
var output = ""
var failures: Array = []
var checks = 0

class MemorySaves extends RefCounted:
	var error = "Тест: запись недоступна"
	var fail = false
	func list_heroes(): return []
	func write(_id, _session, _draft): return not fail

func _initialize(): call_deferred("run")

func check(value: bool, text: String):
	checks += 1
	if not value:
		failures.append(text)
		printerr("FAIL: " + text)

func settle():
	for _i in 8: await process_frame

func shot(name: String):
	await settle()
	if output and DisplayServer.get_name() != "headless":
		RenderingServer.force_draw(false)
		root.get_texture().get_image().save_png(output.path_join(name + ".png"))

func dialog():
	for child in ui.get_children():
		if child is InspectionWindow and child.visible and not child.is_queued_for_deletion(): return child
	return null

func reward_grid():
	return ui.victory_view.rewards

func run():
	root.gui_embed_subwindows = true
	root.size = Vector2i(432,1008)
	if not OS.get_cmdline_user_args().is_empty(): output = OS.get_cmdline_user_args()[0]
	ui = load("res://scenes/main.tscn").instantiate()
	ui.session = preload("res://tests/campaign_driver.gd").new(ui.data)
	ui.saves = MemorySaves.new()
	root.add_child(ui)
	await settle()
	check(ui.theme.default_font.get_font_name() == "Golos Text", "Browser body font bundled locally")
	check(ui.GothicTheme.DISPLAY_FONT.get_font_name() == "Prata", "Display font is Prata")
	var button_style = ui.theme.get_stylebox("normal", "Button")
	check(button_style.axis_stretch_horizontal == StyleBoxTexture.AXIS_STRETCH_MODE_TILE, "Button center tiles without horizontal distortion")
	check(button_style.get_texture_margin(SIDE_TOP) >= 22, "Clipped button corners remain in fixed slices")
	await shot("home")
	ui.session.combat.rng.seed = 43
	ui.session.create("Зая", {"strength":1,"agility":1,"vitality":1,"intelligence":4}, ui.data.portraits[0].id)
	ui.hero_id = "memory-only-test"
	ui.session.game.journey.mapPreset = "forest"
	ui.session.game.souls = 125
	ui.show_game()
	await shot("map")
	ui.session.travel("fight-1")
	var deck = ui.session.combat.build_deck(ui.session.game.player)
	ui.session.game.player.deck.hand = [deck[3], deck[5], deck[8], deck[0]]
	ui.show_game()
	await settle()
	var battle = ui.combat_view
	var hand_before = ui.session.game.player.deck.hand.duplicate(true)
	check(not battle.hint.visible, "No instruction line under hand")
	for frame in battle.header.frames:
		check(frame.texture != null and frame.get_index() > battle.header.enemy_portrait.get_index(), "Textured frame drawn above portrait")
	root.size = Vector2i(896,800)
	await shot("combat-wide-hand")
	check(battle.hand_columns == 2, "Wide hand is 2 by 2")
	check(battle.cards[2].position.y > battle.cards[0].position.y and battle.cards[3].position.y == battle.cards[2].position.y, "Second row contains remaining two cards")
	root.size = Vector2i(432,1008)
	await settle()
	ui.place_card(battle.cards[0].card_id, 0, 0)
	check(not battle.cards[0].visible and battle.cards.filter(func(c): return c.visible).size() == 3, "Placed figure removed from choice")
	check(ui.session.game.player.deck.hand == hand_before, "Hiding a figure does not discard it from the saved hand")
	ui.remove_card(battle.cards[0].card_id)
	check(battle.cards[0].visible and battle.cards.filter(func(c): return c.visible).size() == 4, "Removing from board restores choice")
	ui.place_card(battle.cards[0].card_id, 0, 0)
	ui.place_card(battle.cards[1].card_id, 6, 0)
	await shot("combat-cover")
	var cell = {"known":true,"playerDamage":0,"playerStaminaDamage":0}
	check(ui.board.damage_rows(cell, "player").is_empty(), "Empty cell has no zero damage counters")
	cell.playerDamage = 2
	check(ui.board.damage_rows(cell, "player").size() == 1 and ui.board.damage_rows(cell,"player")[0].kind == "health", "Health-only damage has no stamina counter")
	cell.playerStaminaDamage = 1
	check(ui.board.damage_rows(cell, "player")[1].kind == "stamina", "Stamina follows health on separate line")
	cell.playerDamage = 0
	check(ui.board.damage_rows(cell, "player").size() == 1 and ui.board.damage_rows(cell,"player")[0].kind == "stamina", "Stamina-only damage has no health counter")
	ui.session.game.phase = "victory"
	ui.session.finish_battle()
	var victory = ui.session.game.duplicate(true)
	ui.show_game()
	await shot("rewards")
	for tile in reward_grid().buttons: check(is_equal_approx(tile.size.x, tile.size.y), "Reward target is square")
	for i in ui.session.game.rewardOptions.size():
		var before = ui.session.game.duplicate(true)
		reward_grid().buttons[i].pressed.emit()
		await settle()
		var inspection = dialog()
		check(inspection != null and inspection.get_ok_button().text in ["Получить", "Заменить"], "Inspection has claim action")
		check(ui.session.game == before, "Opening reward does not claim")
		check(ui.get_global_rect().encloses(inspection.panel.get_global_rect()), "Reward card fits narrow viewport")
		await shot("reward-" + ui.session.game.rewardOptions[i].kind)
		inspection.canceled.emit()
		await settle()
		check(ui.session.game == before, "Dismissing reward leaves all choices available")
	# An unsuccessful save must keep both the reward and the inspection available.
	reward_grid().buttons[0].pressed.emit()
	ui.saves.fail = true
	var inspection = dialog()
	inspection.confirmed.emit()
	await settle()
	check(ui.session.game == victory and inspection.visible, "Failed claim write rolls back and keeps dialog open")
	ui.saves.fail = false
	inspection.confirmed.emit()
	inspection.confirmed.emit()
	await settle()
	check(ui.session.game.phase == "victory" and ui.session.game.victoryReward.progressionPending and ui.session.game.rewardOptions.is_empty() and ui.session.game.souls == victory.souls, "Explicit claim succeeds once, preserves shards and offers an affordable upgrade")
	ui.victory_view.continue_button.pressed.emit()
	await settle()
	check(ui.session.game.phase == "ready", "Continue leaves the upgrade offer for the journey")
	# Every reward kind uses the same claim path; full skill slots defer mutation.
	for i in victory.rewardOptions.size():
		if victory.rewardOptions[i].kind == "souls": continue
		ui.session.game = victory.duplicate(true)
		ui.show_game()
		ui.show_reward_details(i)
		var entry = ui.reward_entry(victory.rewardOptions[i])
		if entry.eligible:
			dialog().confirmed.emit()
			await settle()
			check(ui.session.game.victoryReward.progressionPending, "Claim item/skill offers an affordable upgrade")
			ui.victory_view.continue_button.pressed.emit()
			await settle()
			check(ui.session.game.phase == "ready", "Continue after item/skill returns to journey")
		else:
			check(dialog().get_ok_button().disabled, "Unusable item can be inspected, not claimed")
			dialog().canceled.emit()
			await settle()
	var skill_index = -1
	for i in victory.rewardOptions.size():
		if victory.rewardOptions[i].kind == "skill": skill_index = i
	if skill_index >= 0:
		ui.session.game = victory.duplicate(true)
		ui.session.game.player.skills = ui.data.skills.filter(func(s): return s.id != victory.rewardOptions[skill_index].skillId).slice(0,3).map(func(s): return s.id)
		var previous_skills = ui.session.game.player.skills.duplicate()
		ui.show_game()
		ui.show_reward_details(skill_index)
		dialog().confirmed.emit()
		await settle()
		check(ui.session.game.phase == "victory" and ui.session.game.player.skills == previous_skills, "Full skill slots await replacement without losing reward")
	ui.hero_id = ""
	print("UI_REFINEMENT: %s (%d checks; %d failures)" % ["PASS" if failures.is_empty() else "FAIL", checks, failures.size()])
	quit(0 if failures.is_empty() else 1)
