extends SceneTree
const SquareButton = preload("res://ui/square_button.gd")
const CombatHelp = preload("res://ui/combat_help_dialog.gd")
var ui
var output = ""
var checks = 0
var failures: Array = []

class MemorySaves extends RefCounted:
	var error = "Тест: запись недоступна"
	var fail = false
	var saved: Dictionary = {}
	func list_heroes(): return []
	func write(_id, session, draft):
		if fail: return false
		saved = {"game": session.game.duplicate(true), "rngState": str(session.combat.rng.state), "draft": draft.duplicate(true)}
		return true

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
		RenderingServer.force_draw(false)
		root.get_texture().get_image().save_png(output.path_join(name + ".png"))
func click(point: Vector2):
	for pressed in [true, false]:
		var event = InputEventMouseButton.new()
		event.position = point
		event.button_index = MOUSE_BUTTON_LEFT
		event.pressed = pressed
		root.push_input(event, true)
func descendants(node) -> Array:
	var result: Array = []
	for child in node.get_children():
		result.append(child)
		result.append_array(descendants(child))
	return result
func check_bounds(window, tag: String):
	var bounds = window.body.get_global_rect().grow(1)
	check(ui.get_global_rect().encloses(window.panel.get_global_rect()), "Window fits safe viewport: " + tag)
	for i in 3:
		window.select_tab(i)
		await settle()
		check(not descendants(window.pages[i]).any(func(n): return n is ScrollContainer), "Core tab has no scrolling: " + tag)
		for child in window.pages[i].canvas.get_children():
			if child is Control and child.visible:
				check(bounds.encloses(child.get_global_rect()), "Content fits: %s tab%d %s %s" % [tag,i,child.get_class(),child.get_global_rect()])
		if i == 2 and not window.pages[2].wide:
			var equipment = window.pages[2]
			check(equipment.mannequin.get_rect().end.y + 12 <= equipment.divider.position.y, "Mannequin clears the section divider")
			check(equipment.divider.get_rect().end.y + 8 <= equipment.skill_title.position.y, "Divider clears the skill heading")
			check(equipment.skill_title.get_rect().end.y + 8 <= equipment.skills[0].position.y, "Skill heading clears the tiles")
		if i == 1:
			var attributes = window.pages[1]
			if attributes.wide:
				var previous_bottom = -1.0
				for row in attributes.rows.values():
					check(row.position.x == 2 and row.position.y >= previous_bottom, "Wide attributes form one ordered left column")
					previous_bottom = row.get_rect().end.y
					for control in [attributes.shards, attributes.price, attributes.warning, attributes.confirm]:
						check(row.get_rect().end.x < control.position.x, "Balance, cost, hint and confirmation are to the right of all attributes")
			for row in window.pages[1].rows.values():
				check(row.get_global_rect().grow(1).encloses(row.value.get_global_rect()), "Large stat value stays inside row")
				var extent = row.value.get_theme_font("font").get_string_size(row.value.text,HORIZONTAL_ALIGNMENT_LEFT,-1,row.value.get_theme_font_size("font_size")).x
				check(extent <= row.value.size.x, "Stat number fits without clipping")
				if not row.locked: check(row.plus.size.x == row.plus.size.y and row.minus.size.x == row.minus.size.y, "Increment controls remain square")
	var safe_origin = Vector2(ui.margin.get_theme_constant("margin_left"), ui.margin.get_theme_constant("margin_top"))
	var safe_size = window.size - safe_origin - Vector2(ui.margin.get_theme_constant("margin_right"), ui.margin.get_theme_constant("margin_bottom"))
	if safe_size.y > safe_size.x * 1.65:
		check(is_equal_approx(window.panel.position.y + window.panel.size.y, safe_origin.y + safe_size.y), "Narrow window rests on safe bottom: " + tag)
	if safe_size.x > safe_size.y * 1.8:
		check(is_equal_approx(window.panel.position.x, safe_origin.x + (safe_size.x - window.panel.size.x) / 2) and window.panel.size.x < safe_size.x, "Wide window stays centered without filling width: " + tag)
	var first = window.tabs[0].position.x
	var last = window.tabs[4].position.x + window.tabs[4].size.x
	check(is_equal_approx((first + last) / 2, window.navigation.size.x / 2), "Tab group centered: " + tag)
	for button in window.tabs:
		check(is_equal_approx(button.size.x, button.size.y), "Tab button stays square: " + tag)
		check(window.panel.get_global_rect().encloses(button.get_global_rect()), "Bottom tab fits panel")
	check(window.pages[3] is ScrollContainer, "Menu can scroll")
	window.select_tab(0)
	await settle()
	var hero = window.pages[0]
	var source_size = Vector2(hero.portrait.texture.get_size())
	check(is_equal_approx(hero.portrait.size.x / hero.portrait.size.y, source_size.x / source_size.y), "Portrait retains the source aspect ratio: " + tag)
	check(hero.canvas.get_global_rect().grow(1).encloses(hero.portrait.get_global_rect()), "Full portrait stays inside content: " + tag)
	check(hero.level.position.y == hero.shards.position.y and hero.level.get_rect().end.x <= hero.shards.position.x, "Level and balance share one row")
	for bar in [hero.health, hero.stamina]:
		check(bar.label.get_rect().end.x <= bar.value_label.position.x + 1, "Resource caption on left, numbers on right")
		check(bar.value_label.size.x >= bar.value_label.get_theme_font("font").get_string_size(bar.value_label.text, HORIZONTAL_ALIGNMENT_LEFT, -1, bar.value_label.get_theme_font_size("font_size")).x, "Resource numbers have enough visible width")
		check(bar.value_label.text.contains(" / ") and not bar.label.text.contains("/"), "Resource caption and numbers are separate")
	window.select_tab(3)
	await settle()
	for action in window.pages[3].content.get_children():
		if action is Button: check(action.size.y >= 44 and action.size.y >= action.get_minimum_size().y, "Compact menu keeps readable labels and tappable rows: " + tag)
	check(window.pages[2].divider.visible == not window.pages[2].wide, "Equipment separator is portrait only: " + tag)
	check(window.landscape.visible and window.inner_shadow.get_index() > window.landscape.get_index(), "Menu art stays under inward shadows")
	if window.panel.size.x > window.panel.size.y:
		check(window.landscape.size.y > window.panel.size.y * 0.9, "Landscape fills wide menu")
	else:
		check(window.landscape.position.y == window.panel.size.y * 0.5, "Portrait menu art begins at half height")

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
	ui.session.create("Зая", {"strength":3,"agility":2,"vitality":1,"intelligence":1}, ui.data.portraits[0].id)
	ui.hero_id = "memory-only-character-test"
	ui.show_game()
	ui.show_character()
	ui.character_window.select_tab(2)
	await settle()
	for equipment in ui.data.items.filter(func(item): return item.get("unarmed", false)):
		var slot = ui.character_window.pages[2].slots[equipment.slot]
		check(slot.tooltip_text == equipment.name, "Mannequin displays basic item: " + equipment.name)
		check(slot.get_children().any(func(child): return child is TextureRect and child.texture != null), "Basic mannequin slot has artwork")
		slot.pressed.emit()
		await settle()
		check(ui.inspection_window != null and ui.inspection_window.cards[0].entry.reference == equipment.id, "Basic slot opens ordinary equipment card")
		check(not ui.inspection_window.cards[0].entry.figures.is_empty(), "Basic item card has combat figures")
		ui.inspection_window.close_button.pressed.emit()
		await settle()
	ui.character_window.tabs[4].pressed.emit()
	await settle()
	ui.session.game.souls = 32
	ui.session.game.player.hp = 24
	ui.session.game.player.stamina = 5
	ui.session.game.player.gear.weapon = "dagger"
	ui.session.game.player.gear.shield = "buckler"
	ui.session.game.player.skills = ui.data.skills.slice(0,3).map(func(skill): return skill.id)
	ui.show_game()
	await settle()
	var journey = ui.journey_view
	journey.select_node("fight-5")
	var original = ui.session.game.duplicate(true)
	var rng = ui.session.combat.rng.state
	journey.header.player_portrait.pressed.emit()
	await settle()
	var window = ui.character_window
	check(is_instance_valid(window), "Map portrait opens tabs")
	check(ui.journey_view == journey and journey.selected == "fight-5", "Opening retains route selection and instance")
	check(journey.process_mode == Node.PROCESS_MODE_INHERIT and not journey.can_process(), "Underlying game input is suspended")
	ui.show_character()
	check(ui.character_window == window, "Repeated opening never duplicates window")
	check(window.tabs.size() == 5 and window.tabs[4].kind == 4, "Four icon-only tabs and bottom close")
	check(ui.GothicTheme.DISPLAY_FONT.get_font_name() == "Prata" and ui.GothicTheme.DISPLAY_FONT.variation_embolden > 0, "Prata has a subtle heavier variation")
	check(window.pages[0].portrait.texture == ui.data.portrait(ui.session.game.player), "Hero profile uses the complete transparent portrait")
	var mannequin_image = preload("res://content/ui/equipment-mannequin-v2.png").get_image()
	check(mannequin_image.get_pixel(0, 0).a == 0 and mannequin_image.get_pixel(mannequin_image.get_width() / 2, mannequin_image.get_height() / 2).a > 0.9, "New mannequin has genuine transparent surroundings")
	await shot("hero")
	click(window.tabs[1].get_global_rect().get_center())
	await settle()
	check(window.current_tab == 1, "Pointer event switches tab")
	var attributes = window.pages[1]
	check(attributes.confirm.disabled and attributes.shards.amount == 32 and attributes.price.amount == 3, "Initial balance and next upgrade price")
	click(attributes.rows.strength.plus.get_global_rect().get_center())
	check(attributes.pending.get("strength",0) == 1, "Square control receives pointer event through overlay")
	check(attributes.price.amount == 4, "One selected point shows the price of the next point")
	attributes.rows.vitality.plus.pressed.emit()
	check(ui.session.game == original, "Pending increments do not mutate game")
	check(attributes.shards.amount == 25 and attributes.price.amount == 5, "Balance deducts the whole draft; price shows the next single point")
	attributes.rows.strength.minus.pressed.emit()
	check(attributes.shards.amount == 29 and attributes.price.amount == 4, "Minus restores balance and the next single-point price")
	attributes.rows.strength.minus.pressed.emit()
	check(attributes.pending.get("strength",0) == 0, "Minus cannot reduce base stat")
	ui.saves.fail = true
	attributes.confirm.pressed.emit()
	check(ui.session.game == original and attributes.pending.vitality == 1 and attributes.warning.text == ui.saves.error, "Failed save restores full game and keeps pending selection")
	ui.saves.fail = false
	attributes.confirm.pressed.emit()
	check(ui.session.game.player.stats.vitality == 2 and ui.session.game.player.hp == 50 and ui.session.game.souls == 29, "Confirmation spends and fully heals vitality atomically")
	check(attributes.confirm.disabled and attributes.pending.is_empty() and attributes.price.amount == 4, "Successful confirmation resets draft and preserves the single-point price")
	check(journey.header.shards.amount == 29 and journey.selected == "fight-5", "Header updates without resetting map")
	attributes.confirm.pressed.emit()
	check(ui.session.game.souls == 29, "Repeated confirmation never spends twice")
	check(ui.session.restore(ui.saves.saved).is_empty() and ui.session.game.souls == 29, "Confirmed allocation survives save restore")
	attributes.rows.strength.plus.pressed.emit()
	var committed = ui.session.game.duplicate(true)
	window.tabs[4].pressed.emit()
	await settle()
	check(not is_instance_valid(ui.character_window) and journey.can_process() and ui.session.game == committed, "Close discards only unconfirmed increments and resumes map")
	# Demonstrate and stress large digits with valid current prices.
	ui.session.game.player.stats.strength = 999
	ui.session.game.souls = 12345
	journey.header.player_portrait.pressed.emit()
	window = ui.character_window
	attributes = window.pages[1]
	window.select_tab(1)
	attributes.rows.strength.plus.pressed.emit()
	var preview_value = attributes.rows.strength.value
	check(preview_value.current_text == "999 → " and preview_value.proposed_text == "1000", "Attribute preview separates current and proposed values")
	check(preview_value.current_color == ui.data.color("text-home") and preview_value.proposed_color == ui.data.color("text-success"), "Only proposed value is green")
	check(preview_value.get_theme_font("font").get_font_name() == "Prata", "Attribute numbers use the shared serif font")
	var pending = attributes.pending.duplicate(true)
	for pixels in [Vector2i(432,1008),Vector2i(896,800),Vector2i(800,896),Vector2i(1008,432),Vector2i(320,640),Vector2i(640,320),Vector2i(432,1008)]:
		root.size = pixels
		await settle()
		await check_bounds(window, str(pixels))
		check(attributes.pending == pending, "Fold preserves upgrade draft")
		window.select_tab(1)
		await shot("attributes-%dx%d" % [pixels.x,pixels.y])
	check(ui.session.combat.rng.state == rng, "Tabs/layout/upgrade do not consume combat RNG")
	window.select_tab(2)
	await shot("equipment")
	root.size = Vector2i(1008,432)
	await shot("equipment-wide")
	root.size = Vector2i(432,1008)
	await settle()
	check(window.pages[2].slots.size() == 6 and window.pages[2].skills.size() == 3, "Six equipment and three skill slots")
	window.pages[2].slots.weapon.pressed.emit()
	await settle()
	check(is_instance_valid(ui.inspection_window), "Equipment tap opens description")
	ui._notification(Node.NOTIFICATION_WM_GO_BACK_REQUEST)
	await settle()
	check(is_instance_valid(ui.character_window), "Android Back closes description first")
	window.select_tab(3)
	await shot("menu")
	root.size = Vector2i(1008,432)
	await shot("menu-wide")
	root.size = Vector2i(432,1008)
	await settle()
	window.pages[3].show_rules()
	await settle()
	check(not window.can_process() and ui.get_children().any(func(node): return node is CombatHelp) and ui.session.game.player.stats.strength == 999, "Rules open illustrated help above the menu without applying pending stat")
	ui._notification(Node.NOTIFICATION_WM_GO_BACK_REQUEST)
	check(is_instance_valid(ui.character_window) and window.can_process() and window.current_tab == 3, "Back from rules returns to menu")
	ui._notification(Node.NOTIFICATION_WM_GO_BACK_REQUEST)
	await settle()
	check(not is_instance_valid(ui.character_window) and ui.screen == "game", "Back closes overlay and stays in game")
	# Combat keeps dealt cards, placements, reveal and all state untouched.
	ui.session.game = original.duplicate(true)
	ui.session.travel("fight-1")
	ui.show_game()
	await settle()
	var combat = ui.combat_view
	var card = ui.session.game.player.deck.hand[0]
	ui.place_card(card.id,0,0)
	var placements = ui.draft.duplicate(true)
	var battle = ui.session.game.duplicate(true)
	rng = ui.session.combat.rng.state
	combat.header.player_portrait.pressed.emit()
	window = ui.character_window
	window.select_tab(1)
	attributes = window.pages[1]
	check(window.pages[0].stamina.displayed_value == combat.header.bars[1].displayed_value, "Hero tab shares the placement-cost forecast")
	await settle()
	check(window.body.get_global_rect().grow(1).encloses(attributes.warning.get_global_rect()), "Combat warning stays visible above confirmation")
	await shot("attributes-combat")
	click(combat.action.get_global_rect().get_center())
	check(ui.session.game == battle, "Overlay consumes taps aimed at underlying combat action")
	check(attributes.locked and attributes.confirm.disabled and attributes.warning.text == "Недоступно во время боя", "Combat attribute tab explicitly locked")
	check(descendants(attributes).filter(func(c): return c is SquareButton).size() == 8, "Combat retains all plus/minus controls")
	check(descendants(attributes).filter(func(c): return c is SquareButton).all(func(c): return c.visible and c.disabled), "Combat plus/minus controls are visible and disabled")
	attributes.change("strength",1)
	attributes.commit()
	check(not ui.session.upgrade("strength").is_empty(), "Backend also rejects upgrading in battle")
	root.size = Vector2i(1008,432)
	await settle()
	await check_bounds(window,"combat landscape")
	window.close()
	await settle()
	check(ui.combat_view == combat and ui.draft == placements and ui.session.game == battle and ui.session.combat.rng.state == rng, "Closing battle tabs preserves hand/board/reveal/history/RNG")
	check(combat.can_process(), "Combat input resumes")
	# Atomic validation: reject stale/invalid allocations, include sub-level-zero pricing.
	ui.session.game = original.duplicate(true)
	var state = ui.session.game.duplicate(true)
	for invalid in [{"unknown":1},{"strength":-1},{"strength":0.5},{"strength":"1"},{"strength":1000001},{"strength":INF}]:
		check(not ui.session.upgrade_attributes(invalid,state.player.stats,int(state.souls)).is_empty() and ui.session.game == state,"Invalid allocation leaves save unchanged")
	check(not ui.session.upgrade_attributes({"strength":1},state.player.stats,33).is_empty(), "Stale balance rejected")
	check(not ui.session.upgrade_attributes({"strength":100},state.player.stats,32).is_empty() and ui.session.game == state, "Unaffordable allocation is atomic")
	ui.session.game.player.stats = {"strength":1,"agility":1,"vitality":1,"intelligence":1}
	check(ui.session.attribute_quote({"strength":4}).cost == 9, "Batch matches repeated upgrade formula across clamped level zero")
	ui.hero_id = ""
	print("CHARACTER_WINDOW: %s (%d checks; %d failures)" % ["PASS" if failures.is_empty() else "FAIL",checks,failures.size()])
	quit(0 if failures.is_empty() else 1)
