extends SceneTree
const Model = preload("res://ui/inspection_model.gd")
const Card = preload("res://ui/card_button.gd")
const Modal = preload("res://ui/modal_dialog.gd")
var ui
var output = ""
var checks = 0
var failures: Array = []
class MemorySaves extends RefCounted:
	var fail = false
	var error = "Тест: ошибка сохранения"
	func list_heroes(): return []
	func write(_id,_session,_draft): return not fail
class MemoryPreferences extends RefCounted:
	var animated = false
	var last_hero = ""
	func write(): return true
func _initialize(): call_deferred("run")
func check(value: bool, message: String):
	checks += 1
	if not value:
		failures.append(message)
		printerr("FAIL: " + message)
func settle():
	for _i in 10: await process_frame
func shot(name: String):
	await settle()
	if output and DisplayServer.get_name() != "headless":
		RenderingServer.force_draw(false)
		root.get_texture().get_image().save_png(output.path_join(name+".png"))
func click(point: Vector2):
	for pressed in [true,false]:
		var event = InputEventMouseButton.new()
		event.position = point
		event.button_index = MOUSE_BUTTON_LEFT
		event.pressed = pressed
		root.push_input(event,true)
func geometry(window):
	check(ui.get_global_rect().grow(1).encloses(window.panel.get_global_rect()),"Inspection fits safe viewport")
	for node in [window.title,window.scroll,window.close_button]:
		check(window.panel.get_global_rect().grow(1).encloses(node.get_global_rect()),"Fixed and scrolling areas stay inside frame")
	if window.primary.visible:
		for button in [window.primary,window.secondary]:
			if button.visible: check(window.panel.get_global_rect().grow(1).encloses(button.get_global_rect()),"Footer action fits")
		check(not window.secondary.visible or not window.primary.get_rect().intersects(window.secondary.get_rect()),"Footer actions do not overlap")
		check(not window.primary.get_rect().intersects(window.close_button.get_rect()),"Close stays separate from primary action")
	check(not window.scroll.get_rect().intersects(window.header.get_rect()) and not window.scroll.get_rect().intersects(window.footer.get_rect()),"Only body scrolls between pinned header/footer")
	var header_before = window.title.get_global_rect()
	var footer_before = window.close_button.get_global_rect()
	window.scroll.scroll_vertical = 100000
	await settle()
	check(window.scroll.scroll_vertical > 0 if window.body_padding.size.y > window.scroll.size.y + 1 else window.scroll.scroll_vertical == 0,"Content scrolls only when it exceeds the viewport")
	check(header_before == window.title.get_global_rect() and footer_before == window.close_button.get_global_rect(),"Scrolling never moves header/footer")
	check(not window.scroll.get_h_scroll_bar().visible,"No horizontal scrolling")
	check(window.body.size.x <= window.scroll.size.x + 1, "Card content never expands past the viewport")
	for inspected in window.cards:
		for row in inspected.figure_rows:
			check(row.preview.cell_pitch >= 30, "Inspection figures retain a readable cell size")
			check(row.preview.get_global_rect().end.x <= row.words.global_position.x, "Larger figures do not overlap formulas")
			check(row.words.get_global_rect().end.x <= inspected.get_global_rect().end.x + 1, "Formula column fits its card")
			check(row.formula.get_content_height() <= row.formula.size.y + 1, "Every wrapped formula line remains visible")
			check(row.formula.get_parsed_text() == "\n".join(row.model.formula_lines(inspected.entry.fighter, row.preview.card)), "Highlighted formula preserves its complete literal text")
			check(row.formula.result_color == ui.data.color("text-success"), "Formula result uses palette highlight")
	window.scroll.scroll_vertical = 0
	for _step in 4:
		for pressed in [true,false]:
			var event = InputEventMouseButton.new()
			event.position = window.scroll.get_global_rect().get_center()
			event.button_index = MOUSE_BUTTON_WHEEL_DOWN
			event.pressed = pressed
			root.push_input(event,true)
	await settle()
	check(window.scroll.scroll_vertical > 0 if window.body_padding.size.y > window.scroll.size.y + 1 else window.scroll.scroll_vertical == 0,"Pointer scroll reaches overflowing content through the decorative layers")
	window.scroll.scroll_vertical = 0
	var left = ui.margin.get_theme_constant("margin_left")
	var right = ui.margin.get_theme_constant("margin_right")
	var top = ui.margin.get_theme_constant("margin_top")
	var bottom = ui.margin.get_theme_constant("margin_bottom")
	var area = ui.size-Vector2(left+right,top+bottom)
	if area.y > area.x*1.65:
		check(is_equal_approx(window.panel.position.y+window.panel.size.y,ui.size.y-bottom),"Narrow card is attached to safe bottom")
	else:
		check(is_equal_approx(window.panel.get_rect().get_center().x,left+area.x/2),"Wide card is centered horizontally")

func check_touch_scroll(window):
	# Use a short landscape window so even a small skill description overflows.
	var original_size = root.size
	var original_scale = root.content_scale_size
	root.content_scale_size = Vector2i(480,400)
	root.size = Vector2i(1008,432)
	await settle()
	# Start the actual touchscreen gesture on the illustration, not on text.
	var row = window.cards[0].figure_rows[0]
	window.scroll.scroll_vertical = 0
	await settle()
	window.scroll.scroll_vertical = int(row.preview.get_global_rect().get_center().y - window.scroll.global_position.y - window.scroll.size.y * 0.5)
	await settle()
	var point = row.preview.get_global_rect().get_center()
	check(window.scroll.get_global_rect().has_point(point), "Touch scroll starts on a visible figure")
	var offset = window.scroll.scroll_vertical
	var before = ui.session.game.duplicate(true)
	var title_rect = window.title.get_global_rect()
	var footer_rect = window.close_button.get_global_rect()
	var press = InputEventScreenTouch.new()
	press.position = point
	press.pressed = true
	root.push_input(press, true)
	# push_input bypasses Input's touch-to-mouse emulation. Supply the same
	# emulated stream Android sends to the built-in ScrollContainer.
	var mouse = InputEventMouseButton.new()
	mouse.device = -1
	mouse.position = point
	mouse.button_index = MOUSE_BUTTON_LEFT
	mouse.pressed = true
	root.push_input(mouse, true)
	for step in 6:
		var drag = InputEventScreenDrag.new()
		drag.position = point + Vector2(0, 14 * (step + 1))
		drag.relative = Vector2(0, 14)
		root.push_input(drag, true)
		var motion = InputEventMouseMotion.new()
		motion.device = -1
		motion.position = drag.position
		motion.relative = drag.relative
		motion.button_mask = MOUSE_BUTTON_MASK_LEFT
		root.push_input(motion, true)
		await process_frame
	press.position = point + Vector2(0, 84)
	press.pressed = false
	root.push_input(press, true)
	mouse.position = press.position
	mouse.pressed = false
	root.push_input(mouse, true)
	await settle()
	check(window.scroll.scroll_vertical < offset - 20, "Swiping on a figure scrolls the containing equipment or skill card")
	check(window.title.get_global_rect() == title_rect and window.close_button.get_global_rect() == footer_rect, "Touch gesture keeps header and footer fixed")
	check(ui.session.game == before and row.preview.pointer == -3, "Inspection swipe neither starts a combat gesture nor mutates the game")
	window.scroll.scroll_vertical = 0
	root.content_scale_size = original_scale
	root.size = original_size
	await settle()

func run():
	root.gui_embed_subwindows = true
	root.size = Vector2i(480,900)
	if not OS.get_cmdline_user_args().is_empty(): output = OS.get_cmdline_user_args()[0]
	ui = load("res://scenes/main.tscn").instantiate()
	ui.session = preload("res://tests/campaign_driver.gd").new(ui.data)
	ui.saves = MemorySaves.new()
	ui.preferences = MemoryPreferences.new()
	root.add_child(ui)
	await settle()
	ui.session.combat.rng.seed = 43
	ui.session.create("Зая",{"strength":3,"agility":2,"vitality":1,"intelligence":1},ui.data.portraits[0].id)
	ui.hero_id = "memory-inspection"
	var player = ui.session.game.player
	player.gear.weapon = "dagger"
	player.gear.shield = "buckler"
	player.skills = ["dodge","sidestep","bandage"]
	ui.show_game()
	await settle()
	var model = Model.new(ui.data,ui.session.combat)
	var armored = ui.session.game.player.duplicate(true)
	armored.gear.body = "plate@5"
	var lower = model.item_comparison("plate@1", armored, true)[0][0]
	for type in lower.defense:
		check(lower.defenseDelta[type] == ui.data.item("plate@1").defense.get(type, 0) - ui.data.item("plate@5").defense.get(type, 0), "armor delta uses actual item levels")
	var equal = model.item_comparison("plate@5", armored, true)[0][0]
	check(equal.defenseDelta.values().all(func(value): return value == 0), "equal armor has zero delta")
	armored.gear.body = null
	var empty = model.item_comparison("plate@1", armored, true)[0][0]
	check(empty.defenseDelta == empty.defense, "empty slot compares against zero protection")
	var initial = ui.session.game.duplicate(true)
	var rng = ui.session.combat.rng.state
	# All catalog figures use their actual source level, split damage and deck multipliers.
	for equipment in ui.data.items:
		var entry = model.item(equipment.id+"@3",player)
		for card in entry.figures:
			var lines = model.formula_lines(entry.fighter,card)
			check(not "\n".join(lines).contains("Цена"),"No separate price line")
			for part in ui.session.combat.parts(entry.fighter,card):
				if part.value > 0:
					check(lines.any(func(line): return line.begins_with(model.damage_label(part.type)+":") and line.ends_with("= %s × %d" % [model.number(part.value),card.shape.size()])),"Formula matches actual damage by type and shape")
	var sample = {"id":"sample","shape":[[0,0],[1,0]],"healthDamage":{"base":3,"stats":["strength"],"types":{"blunt":1}},"sourceLevel":1}
	var fighter = player.duplicate(true)
	fighter.stats.strength = 1
	check(model.formula_lines(fighter,sample)[0] == "Дробящий урон: 3 + (СИЛ 1 − 1) = 3 × 2","Formula shows baseline subtraction rather than the inconsistent example arithmetic")
	for stat in ui.data.STATS:
		var stat_sample = sample.duplicate(true)
		stat_sample.healthDamage.stats = [stat]
		var line = model.formula_lines(fighter, stat_sample)[0]
		check(line.contains(ui.data.stat_abbreviation(stat)) and not line.contains(ui.data.STAT_NAMES[stat]), "All formula attributes use the common abbreviation")
	var styled = preload("res://ui/formula_label.gd").new()
	root.add_child(styled)
	styled.configure(ui.data, [{"prefix":"[b]буквальный текст[/b] = ", "result":"3 × 2", "suffix":""}])
	check(styled.get_parsed_text() == "[b]буквальный текст[/b] = 3 × 2", "Formula formatting treats source text as literal text")
	styled.queue_free()
	var replaced = model.replaced_items("greatsword",player)
	check(replaced == ["dagger","buckler"],"Two-handed offer compares both displaced items")
	fighter.gear.weapon = "greatsword"
	fighter.gear.shield = null
	check(model.replaced_items("buckler",fighter) == ["greatsword"],"Shield offer compares displaced two-handed weapon")
	check(ui.session.game == initial and ui.session.combat.rng.state == rng,"Building inspections changes neither state nor RNG")
	ui.show_character()
	ui.character_window.select_tab(2)
	await settle()
	var character = ui.character_window
	click(character.pages[2].slots.weapon.get_global_rect().get_center())
	await settle()
	check(is_instance_valid(ui.inspection_window),"Mannequin pointer opens equipment card")
	var window = ui.inspection_window
	check(window.cards.size() == 1 and not window.primary.visible,"Equipped item is read-only")
	check(window.cards[0].figure_rows.all(func(row): return row.preview is Card and not row.preview.interactive and not row.preview.caption.visible),"Inspection reuses actual combat card rendering without drag handlers")
	await shot("weapon")
	await check_touch_scroll(window)
	ui._notification(Node.NOTIFICATION_WM_GO_BACK_REQUEST)
	await settle()
	check(is_instance_valid(character) and character.can_process() and ui.inspection_window == null,"Back closes only inspection and resumes tabs")
	click(character.pages[2].skills[0].get_global_rect().get_center())
	await settle()
	check(ui.inspection_window.cards[0].entry.kind == "skill","Learned skill opens same styled window")
	await shot("skill")
	await check_touch_scroll(ui.inspection_window)
	ui.inspection_window.close()
	character.close()
	await settle()
	ui.show_skill_details("attack-training")
	check(ui.inspection_window.cards[0].figure_rows.is_empty(),"Passive skill does not invent an action figure")
	await shot("passive-skill")
	ui.inspection_window.close()
	await settle()
	# Forge selection opens inspection and requires a separate successful save.
	var forge = {}
	for seed_value in range(1,15):
		ui.session.combat.rng.seed = seed_value
		ui.session.map_fixture(1)
		for node in ui.session.game.journey.map.nodes:
			if node.kind == "forge": forge=node;break
		if not forge.is_empty(): break
	ui.session.game.journey.path = [forge.id]
	ui.session.game.journey.forgeResolved = false
	ui.session.game.journey.offers = ["shortsword@2"]
	ui.session.service_fixture(forge, ui.session.game.journey.offers)
	ui.session.game.phase = "ready"
	ui.show_game()
	await settle()
	var before = ui.session.game.duplicate(true)
	for child in ui.content.get_children():
		if child is BaseButton and not child is Button:
			click(child.get_global_rect().get_center())
			break
	await settle()
	window = ui.inspection_window
	check(is_instance_valid(window) and window.groups.size() == 2,"Forge item tap opens equipped/offered comparison")
	check(ui.session.game == before,"Inspection does not equip or resolve forge")
	for pixels in [Vector2i(480,900),Vector2i(896,800),Vector2i(1008,432),Vector2i(320,640),Vector2i(360,800),Vector2i(432,1008)]:
		root.size = pixels
		await settle()
		await geometry(window)
		check(ui.session.game == before and ui.inspection_window == window,"Folding preserves pending choice and the same window")
		check(window.columns.columns == (1 if pixels.x == 320 else 2),"Comparisons stay side by side except on a very narrow screen")
		await shot("comparison-%dx%d" % [pixels.x,pixels.y])
	ui.saves.fail = true
	window.confirmed.emit()
	await settle()
	ui.get_children().filter(func(node): return node is Modal and node.visible)[0].accept()
	await settle()
	check(window.visible and window.warning.text == ui.saves.error and ui.session.game == before,"Failed forge write keeps comparison and previous item")
	ui.saves.fail = false
	window.confirmed.emit()
	window.confirmed.emit()
	await settle()
	var confirmations = ui.get_children().filter(func(node): return node is Modal and node.visible)
	check(confirmations.size() == 1, "Repeated replacement request opens one confirmation")
	confirmations[0].accept()
	await settle()
	check(ui.session.game.journey.forgeResolved and ui.session.game.player.gear.weapon == "shortsword@2" and ui.inspection_window == null,"Forge confirmation equips once and closes inspection")
	check(ui.margin.can_process(),"Game input resumes after forge confirmation")
	ui.session.game = before.duplicate(true)
	ui.session.game.souls = 20
	ui.session.game.journey.offers = ["shortsword@4"]
	ui.session.game.journey.service.prices = {"shortsword@4": 19}
	ui.show_game()
	ui.show_forge_details("shortsword@4")
	await settle()
	window = ui.inspection_window
	check(window.cards[0].upgrade_button.visible, "Forge offer uses the same requirement upgrade action")
	window.cards[0].upgrade_button.pressed.emit()
	await settle()
	check(ui.session.game.player.stats.strength == 4 and ui.session.game.souls == 17 and ui.session.game.player.gear.weapon == "dagger", "Forge upgrade buys the missing point and keeps existing equipment")
	check(window.primary.disabled and not window.cards[0].upgrade_button.visible, "Forge refresh recalculates purchase affordability after upgrading")
	window.close()
	await settle()
	# A two-handed offer keeps its shorter column visible while both worn items scroll.
	ui.session.game = before.duplicate(true)
	ui.session.game.journey.offers = ["greatsword@10"]
	root.size = Vector2i(896,800)
	ui.show_game()
	ui.show_forge_details("greatsword@10")
	await settle()
	window = ui.inspection_window
	check(window.cards.map(func(card): return card.entry.reference) == ["greatsword@10","dagger","buckler"],"Offered weapon precedes both displaced items")
	check(window.footer_hint.text.begins_with("Характеристик недостаточно") and not window.warning.visible and window.primary.disabled,"Unmet requirements replace the footer hint")
	check(window.footer_hint.get_global_rect().end.y <= window.primary.get_global_rect().position.y,"Footer message stays above actions")
	await shot("two-hands-start")
	var shorter = window.groups[0]
	var longer = window.groups[1]
	var stop = maxi(0,int(shorter.size.y-window.scroll.size.y))+40
	window.scroll.scroll_vertical = stop
	await settle()
	var pinned = shorter.get_global_rect()
	var moving = longer.get_global_rect()
	window.scroll.scroll_vertical += 100
	await settle()
	check(is_equal_approx(shorter.global_position.y,pinned.position.y) and shorter.get_global_rect().intersects(window.scroll.get_global_rect()),"Shorter column stays visible after reaching its own end")
	check(longer.global_position.y < moving.position.y-50,"Longer column continues scrolling independently of the pinned column")
	await shot("two-hands-sticky")
	root.size = Vector2i(432,1008)
	await settle()
	check(window.columns.columns == 2 and window.groups[1].global_position.x > window.groups[0].global_position.x,"Phone comparison keeps offered and worn items side by side")
	root.size = Vector2i(320,640)
	await settle()
	check(window.column_slots.all(func(slot): return is_zero_approx(slot.offset_y)),"Very narrow layout releases sticky offsets")
	check(window.groups[1].global_position.y >= window.groups[0].get_global_rect().end.y,"Very narrow comparison stacks worn items below the offer")
	window.scroll.scroll_vertical = 0
	await shot("two-hands-narrow")
	ui.session.game.player.stats.strength = 10
	var unlocked = ui.offered_item("greatsword@10")
	window.refresh(unlocked.entries,unlocked.settings)
	check(window.footer_hint.text.begins_with("Вы потеряете: ") and not window.primary.disabled,"Eligible offer restores replacement hint")
	ui.session.game.player.gear.weapon = null
	ui.session.game.player.gear.shield = null
	check(ui.offered_item("greatsword@10").settings.hint.is_empty(),"Empty slots need no replacement hint")
	window.close()
	await settle()
	# A stale visible forge dialog cannot act on a different visit.
	ui.session.game = before.duplicate(true)
	ui.show_game()
	ui.show_forge_details("shortsword@2")
	window=ui.inspection_window
	ui.session.game.journey.offers=[]
	var stale=ui.session.game.duplicate(true)
	window.confirmed.emit()
	await settle()
	check(ui.session.game == stale and ui.inspection_window == null,"Stale comparison cannot claim a changed offer")
	ui.session.game=initial.duplicate(true)
	ui.show_game()
	ui.show_forge_details("shortsword@2")
	check(ui.inspection_window == null,"Forge cannot be opened from ordinary map location")
	# Inspection during an existing battle cannot rewrite a dealt deck or placement.
	ui.session.travel("fight-1")
	ui.show_game()
	await settle()
	var combat = ui.combat_view
	ui.place_card(ui.session.game.player.deck.hand[0].id,0,0)
	var battle = ui.session.game.duplicate(true)
	var placement = ui.draft.duplicate(true)
	rng = ui.session.combat.rng.state
	ui.show_character()
	character = ui.character_window
	character.select_tab(2)
	await settle()
	click(character.pages[2].slots.weapon.get_global_rect().get_center())
	await settle()
	window = ui.inspection_window
	check(is_instance_valid(window) and not character.can_process() and not combat.can_process(),"Inspection blocks both underlying tab and battle inputs")
	root.size = Vector2i(896,800)
	await settle()
	ui._notification(Node.NOTIFICATION_WM_GO_BACK_REQUEST)
	await settle()
	check(ui.inspection_window == null and character.can_process() and not combat.can_process(),"Back from card resumes character tabs while battle stays blocked")
	character.close()
	await settle()
	check(ui.session.game == battle and ui.draft == placement and ui.session.combat.rng.state == rng and ui.combat_view == combat,"Battle inspection/folding preserves dealt cards, placements, reveal, history and RNG")
	check(combat.can_process(),"Closing nested inspection restores battle input")
	# Skill comparisons share the same responsive layout as equipment.
	ui.open_inspection([[model.skill("bandage", player, "Предлагается")], [model.skill("dodge", player, "Изучено")]], {"title":"Сравнение навыков", "action":"Заменить"})
	window = ui.inspection_window
	for pixels in [Vector2i(432,1008), Vector2i(360,800), Vector2i(320,640)]:
		root.size = pixels
		await settle()
		check(window.columns.columns == (1 if pixels.x == 320 else 2), "Skill comparison also keeps two columns until the narrow fallback")
		await geometry(window)
		await shot("skills-%dx%d" % [pixels.x,pixels.y])
	window.close()
	await settle()
	print("INSPECTION: %s (%d checks; %d failures)" % ["PASS" if failures.is_empty() else "FAIL",checks,failures.size()])
	quit(0 if failures.is_empty() else 1)
