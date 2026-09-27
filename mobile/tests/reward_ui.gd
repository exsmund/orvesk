extends SceneTree
const InspectionWindow = preload("res://ui/inspection_window.gd")
const ShardCounter = preload("res://ui/shard_counter.gd")
var ui
var output = ""
var failures: Array = []
var checks = 0

class MemorySaves extends RefCounted:
	var error = "Тест: запись недоступна"
	var fail = false
	var saved: Dictionary = {}
	func list_heroes(): return []
	func write(_id, session, _draft):
		if fail: return false
		saved = {"game": session.game.duplicate(true), "rngState": str(session.combat.rng.state)}
		return true

func _initialize(): call_deferred("run")

func check(ok: bool, message: String):
	checks += 1
	if not ok:
		failures.append(message)
		printerr("FAIL: " + message)

func settle():
	for _frame in 8: await process_frame

func dialog():
	for child in ui.get_children():
		if child is InspectionWindow and child.visible and not child.is_queued_for_deletion(): return child
	return null

func grid():
	for child in ui.content.get_children():
		if child.has_signal("inspected"): return child
	return null

func shot(name: String):
	await settle()
	if output and DisplayServer.get_name() != "headless":
		RenderingServer.force_draw(false)
		root.get_texture().get_image().save_png(output.path_join(name + ".png"))

func run():
	root.gui_embed_subwindows = true
	root.size = Vector2i(432,1008)
	if not OS.get_cmdline_user_args().is_empty(): output = OS.get_cmdline_user_args()[0]
	ui = load("res://scenes/main.tscn").instantiate()
	ui.saves = MemorySaves.new()
	root.add_child(ui)
	await settle()
	ui.session.combat.rng.seed = 43
	ui.session.create("Зая", {"strength":1,"agility":1,"vitality":1,"intelligence":4}, ui.data.portraits[0].id)
	ui.hero_id = "memory-only-rewards-test"
	ui.session.travel("fight-1")
	ui.session.game.enemy.stats = ui.session.game.player.stats.duplicate(true)
	ui.session.game.souls = 30
	var combat_state = ui.session.game.duplicate(true)
	ui.session.game.phase = "victory"
	ui.session.finish_battle()
	var hybrid = ui.data.items.filter(func(i): return i.requirements.size() >= 2 and ui.data.item(i.id + "@3").level == 3 and i.requirements.keys().all(func(stat): return ui.session.game.player.stats[stat] < 3))[0]
	var item = ui.data.item(hybrid.id + "@3")
	var skill = ui.data.skills[0]
	ui.session.game.rewardOptions = [{"kind": "skill", "skillId": skill.id}, {"kind": "item", "itemId": item.id}]
	ui.show_game()
	await settle()
	check(ui.session.game.souls == 32, "Currency already credited on reward screen")
	check(grid().buttons.size() == 2, "Only skill and item choices, no currency tile")
	check(ui.content.get_children().any(func(c): return c is ShardCounter and c.prefix == "Получено: " and c.amount == 2), "Automatic award is explicitly labelled")
	check(grid().captions[1].text.contains("На вырост"), "Future item visible as such before opening")
	await shot("reward-choices")
	var before = ui.session.game.duplicate(true)
	grid().buttons[1].pressed.emit()
	await settle()
	var card = dialog()
	check(card.get_ok_button().disabled and card.upgrades.get_child_count() >= 2, "Hybrid item shows every missing requirement")
	if DisplayServer.get_name() != "headless":
		check(card.scroll.get_global_rect().encloses(card.upgrades.get_child(0).get_global_rect()), "First upgrade is visible before scrolling long item lore")
	check(ui.session.game == before, "Inspecting locked item does not pay or grant")
	await shot("reward-upgrade")
	root.size = Vector2i(320,640)
	await settle()
	check(ui.get_global_rect().encloses(card.panel.get_global_rect()), "Scrollable card fits small screen")
	check(card.panel.get_global_rect().encloses(card.get_ok_button().get_global_rect()), "Claim remains inside dialog")
	await shot("reward-upgrade-small")
	root.size = Vector2i(896,800)
	await settle()
	check(ui.session.game == before and ui.get_global_rect().encloses(card.panel.get_global_rect()), "Fold preserves pending reward and requirement state")
	root.size = Vector2i(432,1008)
	await settle()
	# Failed upgrade stays visible and rolls back the spend, stats, offers and RNG.
	ui.saves.fail = true
	card.upgrades.get_child(0).get_child(1).pressed.emit()
	await settle()
	check(ui.session.game == before and card.visible and card.warning.text == ui.saves.error, "Failed upgrade rolls back and reports inside card")
	ui.saves.fail = false
	var quote = ui.session.reward_requirements(1)
	var total = quote.totalCost
	var first = quote.steps[0]
	card.upgrades.get_child(0).get_child(1).pressed.emit()
	await settle()
	check(ui.session.game.player.stats[first.stat] == first.current + 1 and ui.session.game.souls == before.souls - first.cost, "Upgrade button purchases one required point")
	check(ui.session.game.rewardOptions == before.rewardOptions and ui.session.game.phase == "victory", "Level change leaves original two offers intact")
	card.canceled.emit()
	await settle()
	check(dialog() == null and ui.session.game.player.stats[first.stat] == first.current + 1, "Closing card keeps explicitly purchased stat")
	var balance = ui.session.game.souls
	check(ui.session.restore(ui.saves.saved).is_empty() and ui.session.game.souls == balance, "Reload retains purchases without recrediting shards")
	ui.show_game()
	ui.show_reward_details(1)
	await settle()
	card = dialog()
	while not ui.session.reward_requirements(1).steps.is_empty():
		check(not card.upgrades.get_child(0).get_child(1).disabled, "Affordable required upgrade enabled")
		card.upgrades.get_child(0).get_child(1).pressed.emit()
		await settle()
	check(not card.get_ok_button().disabled and card.upgrades.get_child_count() == 0, "Claim unlocks when every requirement is satisfied")
	check(ui.session.game.souls == before.souls - total, "UI purchases respect full increasing-price quote")
	await shot("reward-unlocked")
	card.confirmed.emit()
	card.confirmed.emit()
	await settle()
	check(ui.session.game.phase == "ready" and ui.session.game.player.gear[item.slot] == item.id, "Claim after upgrading equips item exactly once")
	check(ui.session.game.souls == before.souls - total, "Claim adds no extra shards")
	# Insufficient balance disables buying, but keeps the description accessible.
	ui.session.game = before.duplicate(true)
	ui.session.game.souls = 0
	ui.show_game()
	ui.show_reward_details(1)
	await settle()
	card = dialog()
	check(card.upgrades.get_child(0).get_child(1).disabled and card.get_ok_button().disabled, "Unavailable upgrade and item cannot be claimed")
	card.canceled.emit()
	await settle()
	# Full skill slots require a deliberate replacement and retain the awarded shards.
	ui.session.game = before.duplicate(true)
	ui.session.game.player.skills = ui.data.skills.filter(func(s): return s.id != skill.id).slice(0,3).map(func(s): return s.id)
	var old_skills = ui.session.game.player.skills.duplicate()
	ui.show_game()
	ui.show_reward_details(0)
	dialog().confirmed.emit()
	await settle()
	check(ui.session.game.phase == "victory" and ui.session.game.player.skills == old_skills, "Skill claim first asks which slot to replace")
	for child in ui.content.get_children():
		if child is Button and child.text == ui.data.lookup(ui.data.skills, old_skills[0]).name:
			child.pressed.emit()
			break
	await settle()
	check(dialog() != null and ui.session.game.player.skills == old_skills, "Replacement first opens skill comparison")
	dialog().confirmed.emit()
	await settle()
	check(ui.session.game.phase == "ready" and ui.session.game.player.skills[0] == skill.id and ui.session.game.souls == before.souls, "Skill replacement preserves mandatory currency")
	# The combat-result transaction itself must be atomic if storage fails.
	ui.session.game = combat_state.duplicate(true)
	ui.session.game.enemy.hp = 0
	ui.session.game.clashPlan.stage = "reveal"
	ui.session.game.clashPlan.playerPlaced = []
	ui.session.game.clashPlan.enemyPlaced = []
	var pending = ui.session.game.duplicate(true)
	var rng_before = ui.session.combat.rng.state
	ui.show_game()
	ui.saves.fail = true
	check(not ui.act(func(): return ui.session.submit([])), "Failed victory save reports failure")
	check(ui.session.game == pending and ui.session.combat.rng.state == rng_before, "Failed victory write restores currency, phase and RNG")
	ui.saves.fail = false
	check(ui.act(func(): return ui.session.submit([])), "Victory can be retried after write failure")
	check(ui.session.game.phase == "victory" and ui.session.game.souls == pending.souls + 2, "Retry awards shards exactly once")
	ui.hero_id = ""
	print("REWARD_UI: %s (%d checks; %d failures)" % ["PASS" if failures.is_empty() else "FAIL", checks, failures.size()])
	quit(0 if failures.is_empty() else 1)
