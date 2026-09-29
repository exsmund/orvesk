extends SceneTree
const InspectionWindow = preload("res://ui/inspection_window.gd")
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
	return ui.victory_view.rewards

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
	ui.session = preload("res://tests/campaign_driver.gd").new(ui.data)
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
	check(ui.session.game.souls == 33, "Currency already credited on reward screen")
	var award = ui.shard_feedback
	var awarded_state = ui.session.game.duplicate(true)
	check(is_instance_valid(award) and award.particles.size() > 0, "Victory starts shard transfer feedback")
	check(ui.page_header_view.shards.amount == 33 and ui.page_header_view.shards.displayed_amount < 33, "Only displayed balance counts up; committed counter is final")
	award.elapsed = 0.55
	award.update_feedback()
	check(ui.page_header_view.shards.displayed_amount > 30 and ui.page_header_view.shards.displayed_amount < 33, "Balance visibly increases during shard transfer")
	root.size = Vector2i(1008,432)
	await settle()
	check(ui.session.game == awarded_state and ui.shard_feedback == award, "Resize preserves currency, offers and the active animation")
	await shot("shards-in-flight")
	award.finish()
	check(ui.page_header_view.shards.displayed_amount == 33 and ui.victory_view.shards.displayed_amount == 3, "Finishing feedback shows exact awarded and total amounts")
	ui.show_game()
	await settle()
	check(not is_instance_valid(ui.shard_feedback) and ui.session.game == awarded_state, "Rebuilding the reward screen does not replay or recredit its award")
	root.size = Vector2i(432,1008)
	await settle()
	check(grid().buttons.size() == 2, "Only skill and item choices, no currency tile")
	check(ui.victory_view.received.text == "Получено" and ui.victory_view.shards.amount == 3, "Automatic award is explicitly labelled")
	check(ui.victory_view.choice_hint.visible, "Two offers explain that only one can be taken")
	await shot("reward-choices")
	var before = ui.session.game.duplicate(true)
	var view = ui.victory_view
	for pixels in [Vector2i(320,640), Vector2i(896,800), Vector2i(1008,432), Vector2i(1880,880), Vector2i(432,1008)]:
		root.size = pixels
		await settle()
		check(ui.victory_view == view and ui.session.game == before, "Folding keeps reward view, offers and already credited shards")
		for tile in grid().buttons:
			check(ui.scroll.get_global_rect().grow(1).encloses(tile.get_global_rect()) and is_equal_approx(tile.size.x, tile.size.y), "Reward remains square and visible: %s" % pixels)
		check(not grid().buttons[0].get_global_rect().intersects(grid().buttons[1].get_global_rect()), "Offers do not overlap")
		check(ui.victory_view.skip_button.visible and ui.scroll.get_global_rect().grow(1).encloses(ui.victory_view.skip_button.get_global_rect()), "Skip reward is visible on every layout")
		for tile in grid().buttons:
			check(not tile.get_global_rect().intersects(ui.victory_view.skip_button.get_global_rect()), "Skip button does not overlap reward artwork")
		await shot("reward-choices-%dx%d" % [pixels.x,pixels.y])
	ui.session.game.rewardOptions = [before.rewardOptions[0]]
	ui.show_game()
	await settle()
	check(not ui.victory_view.choice_hint.visible and grid().buttons.size() == 1, "Single reward has no either-or hint")
	await shot("reward-single")
	grid().buttons[0].pressed.emit()
	await settle()
	check(dialog() != null and ui.session.game.souls == before.souls and ui.session.game.phase == "victory", "Single reward picture opens existing inspection without claiming")
	await shot("reward-single-open")
	dialog().canceled.emit()
	await settle()
	ui.session.game = before.duplicate(true)
	ui.show_game()
	await settle()
	grid().buttons[1].pressed.emit()
	await settle()
	var card = dialog()
	var offered = card.cards[0]
	check(card.get_ok_button().disabled and offered.requirement_rows.size() >= 2, "Hybrid item shows every missing requirement")
	check(offered.upgrade_button.visible and offered.upgrade_button.cost.amount == ui.session.reward_requirements(1).totalCost, "One upgrade button quotes the complete cost")
	check(offered.upgrade_button.cost.prefix == "Поднять за ", "Upgrade action uses shared shard counter and icon")
	check(offered.upgrade_button.get_index() > offered.requirement_rows.back().get_index() and offered.upgrade_button.get_index() < offered.figure_rows[0].get_index(), "Upgrade action is inside the offered card after requirements and before figures")
	check(card.body.get_children().all(func(child): return child in [card.warning, card.columns]), "No currency or upgrade block remains above cards")
	check(card.cards.slice(1).all(func(entry): return not entry.upgrade_button.visible), "Worn cards do not offer requirement upgrades")
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
	card.cards[0].upgrade_button.pressed.emit()
	await settle()
	check(ui.session.game == before and card.visible and card.warning.text == ui.saves.error, "Failed upgrade rolls back and reports inside card")
	ui.saves.fail = false
	var quote = ui.session.reward_requirements(1)
	var total = quote.totalCost
	card.cards[0].upgrade_button.pressed.emit()
	await settle()
	check(quote.steps.all(func(step): return ui.session.game.player.stats[step.stat] == step.required) and ui.session.game.souls == before.souls - total, "One press buys all missing points for the quoted cost")
	check(not card.cards[0].upgrade_button.visible, "Upgrade button disappears once requirements are met")
	var upgraded = ui.session.game.duplicate(true)
	card.upgrade_requested.emit(quote)
	await settle()
	check(ui.session.game == upgraded, "Repeated stale bulk request never spends twice")
	check(ui.session.game.rewardOptions == before.rewardOptions and ui.session.game.phase == "victory", "Level change leaves original two offers intact")
	card.canceled.emit()
	await settle()
	check(dialog() == null and ui.session.game.player.stats == upgraded.player.stats, "Closing card keeps explicitly purchased stat")
	var balance = ui.session.game.souls
	check(ui.session.restore(ui.saves.saved).is_empty() and ui.session.game.souls == balance, "Reload retains purchases without recrediting shards")
	ui.show_game()
	ui.show_reward_details(1)
	await settle()
	card = dialog()
	check(not card.get_ok_button().disabled and not card.cards[0].upgrade_button.visible, "Claim unlocks when every requirement is satisfied")
	check(ui.session.game.souls == before.souls - total, "UI purchases respect full increasing-price quote")
	await shot("reward-unlocked")
	card.confirmed.emit()
	card.confirmed.emit()
	await settle()
	check(ui.session.game.phase == "victory" and ui.session.game.victoryReward.progressionPending and ui.session.game.player.gear[item.slot] == item.id, "Claim equips item once and offers further affordable upgrades")
	check(ui.session.game.souls == before.souls - total, "Claim adds no extra shards")
	ui.victory_view.continue_button.pressed.emit()
	await settle()
	check(ui.session.game.phase == "ready", "Can defer further upgrades after claiming equipment")
	# Insufficient balance disables buying, but keeps the description accessible.
	ui.session.game = before.duplicate(true)
	ui.session.game.souls = total - 1
	ui.show_game()
	ui.show_reward_details(1)
	await settle()
	card = dialog()
	check(not card.cards[0].upgrade_button.visible and card.get_ok_button().disabled, "Unavailable upgrade and item cannot be claimed")
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
	var replacements = ui.content.get_node("SkillReplacementGrid")
	check(replacements.get_script() == preload("res://ui/reward_grid.gd") and replacements.buttons.size() == old_skills.size(), "Skill replacement reuses reward artwork tiles for every occupied slot")
	for pixels in [Vector2i(320,640), Vector2i(1008,432), Vector2i(432,1008)]:
		root.size = pixels
		await settle()
		for slot in old_skills.size():
			var tile = replacements.buttons[slot]
			check(replacements.pictures[slot].texture != null and tile.tooltip_text == ui.data.lookup(ui.data.skills, old_skills[slot]).name, "Replacement tile shows the correct skill artwork and name")
			check(ui.scroll.get_global_rect().grow(1).encloses(tile.get_global_rect()) and is_equal_approx(tile.size.x, tile.size.y), "Skill replacement tile stays square and visible after resizing")
	await shot("skill-replacement-choices")
	replacements.buttons[0].pressed.emit()
	await settle()
	check(dialog() != null and ui.session.game.player.skills == old_skills, "Replacement first opens skill comparison")
	dialog().canceled.emit()
	await settle()
	check(ui.session.game.player.skills == old_skills and is_instance_valid(replacements), "Cancel comparison retains skills and their image choices")
	replacements.buttons[0].pressed.emit()
	await settle()
	dialog().confirmed.emit()
	await settle()
	check(ui.session.game.victoryReward.progressionPending and ui.session.game.player.skills[0] == skill.id and ui.session.game.souls == before.souls, "Skill replacement opens progression and preserves mandatory currency")
	await check_progression_flow(before)
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
	check(ui.session.game.phase == "victory" and ui.session.game.souls == pending.souls + 3, "Retry awards shards exactly once")
	ui.session.game.victoryReward.recoveredShards = 7
	ui.session.game.rewardOptions = []
	ui.show_game()
	await settle()
	check(ui.victory_view.recovered.visible and ui.victory_view.recovered.amount == 7, "Recovered shard receipt remains visible")
	await shot("reward-empty-recovered")
	var awarded = ui.session.game.souls
	ui.victory_view.continue_button.pressed.emit()
	await settle()
	check(ui.session.game.victoryReward.progressionPending, "Empty pool still offers affordable upgrade")
	ui.victory_view.continue_button.pressed.emit()
	await settle()
	check(ui.session.game.phase == "ready" and ui.session.game.souls == awarded, "Empty reward pool can continue without changing already credited shards")
	ui.hero_id = ""
	print("REWARD_UI: %s (%d checks; %d failures)" % ["PASS" if failures.is_empty() else "FAIL", checks, failures.size()])
	quit(0 if failures.is_empty() else 1)

func check_progression_flow(reward_state: Dictionary):
	# Exercise claim and decline, including exactly enough shards and one short.
	for accepting in [false, true]:
		for count in [1, 2]:
			for balance in [2, 3]:
				ui.session.game = reward_state.duplicate(true)
				ui.session.game.rewardOptions = reward_state.rewardOptions.slice(0, count)
				ui.session.game.souls = balance
				ui.show_game()
				await settle()
				var before = ui.session.game.duplicate(true)
				var rng = ui.session.combat.rng.state
				if accepting:
					grid().buttons[0].pressed.emit()
					await settle()
				ui.saves.fail = true
				if accepting: dialog().confirmed.emit()
				else: ui.victory_view.skip_button.pressed.emit()
				await settle()
				check(ui.session.game == before and ui.session.combat.rng.state == rng, "Failed claim/decline rolls back offers, hero, receipt and RNG")
				ui.saves.fail = false
				if accepting: dialog().confirmed.emit()
				else: ui.victory_view.skip_button.pressed.emit()
				await settle()
				check(ui.session.game.souls == balance, "Claim/decline never discards guaranteed shards")
				if not accepting: check(ui.session.game.player == before.player, "Skip keeps currently equipped gear and skills")
				if balance < 3:
					check(ui.session.game.phase == "ready", "Insufficient shards bypass upgrade screen")
					continue
				check(ui.victory_view.progression and not ui.victory_view.upgrade_button.disabled, "Sufficient shards show enabled level-up action")
				check(grid().buttons.is_empty() and not ui.victory_view.skip_button.visible, "Resolved offers are no longer selectable")
				check(ui.session.restore(ui.saves.saved).is_empty(), "Reload post-reward save")
				ui.show_game()
				await settle()
				check(ui.victory_view.progression and ui.session.game.souls == balance, "Reload returns to progression without duplicate currency")
				if accepting:
					ui.victory_view.continue_button.pressed.emit()
					await settle()
					check(ui.session.game.phase == "ready" and ui.session.game.souls == balance, "Upgrade can be postponed")
					continue
				await shot("reward-progression")
				var view = ui.victory_view
				for pixels in [Vector2i(320,640), Vector2i(896,800), Vector2i(1880,880), Vector2i(432,1008)]:
					root.size = pixels
					await settle()
					check(ui.victory_view == view, "Resize preserves progression screen")
					for action in [view.upgrade_button, view.continue_button]:
						check(ui.scroll.get_global_rect().grow(1).encloses(action.get_global_rect()), "Progression actions fit viewport")
					check(not view.upgrade_button.get_global_rect().intersects(view.continue_button.get_global_rect()), "Progression actions do not overlap")
				ui.victory_view.upgrade_button.pressed.emit()
				await settle()
				check(ui.character_window.current_tab == 1, "Level-up opens character attributes directly")
				var attributes = ui.character_window.pages[1]
				attributes.change("strength", 1)
				ui.character_window.close()
				await settle()
				check(ui.session.game.phase == "victory" and ui.session.game.souls == balance, "Closing an unconfirmed allocation stays on the level-up offer")
				ui.victory_view.upgrade_button.pressed.emit()
				attributes = ui.character_window.pages[1]
				attributes.change("strength", 1)
				ui.saves.fail = true
				attributes.confirm.pressed.emit()
				ui.character_window.close()
				await settle()
				check(ui.session.game.phase == "victory" and ui.session.game.souls == balance, "Failed upgrade save cannot trigger continuation on close")
				ui.saves.fail = false
				ui.victory_view.upgrade_button.pressed.emit()
				attributes = ui.character_window.pages[1]
				attributes.change("strength", 1)
				attributes.confirm.pressed.emit()
				await settle()
				check(ui.session.game.souls == 0 and ui.session.game.player.stats.strength == before.player.stats.strength + 1, "Existing attributes page spends exact upgrade cost")
				check(ui.victory_view.upgrade_button.disabled, "Underlying action updates after last affordable upgrade")
				ui.character_window.close()
				await settle()
				check(ui.session.game.phase == "ready" and ui.session.game.souls == 0, "Closing after a confirmed upgrade skips the offer and resumes journey")
				check(ui.saves.saved.game.phase == "ready", "Automatic continuation is saved")
	# Continue even if there are shards left for another upgrade; a failed transition
	# must preserve the successfully purchased point and let the player retry.
	for fail_transition in [false, true]:
		ui.session.game = reward_state.duplicate(true)
		ui.session.game.souls = 30
		ui.show_game()
		ui.victory_view.skip_button.pressed.emit()
		await settle()
		ui.victory_view.upgrade_button.pressed.emit()
		ui.character_window.pages[1].change("strength", 1)
		ui.character_window.pages[1].confirm.pressed.emit()
		check(ui.session.can_upgrade_attributes(), "There is still enough currency to level up again")
		var upgraded = ui.session.game.duplicate(true)
		ui.saves.fail = fail_transition
		ui.character_window.close()
		await settle()
		if fail_transition:
			check(ui.session.game == upgraded and ui.notice.text == ui.saves.error, "Failed automatic transition preserves the upgrade and reports the write error")
			ui.saves.fail = false
			ui.victory_view.continue_button.pressed.emit()
			await settle()
		check(ui.session.game.phase == "ready" and ui.session.game.souls == upgraded.souls and ui.session.game.player.stats == upgraded.player.stats, "Continuation preserves leftover shards and never repeats the upgrade")
