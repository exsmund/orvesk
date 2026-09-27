extends SceneTree
const Model = preload("res://ui/inspection_model.gd")
const Card = preload("res://ui/card_button.gd")
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
			check(window.panel.get_global_rect().grow(1).encloses(button.get_global_rect()),"Footer action fits")
		check(not window.primary.get_rect().intersects(window.secondary.get_rect()),"Footer actions do not overlap")
		check(not window.primary.get_rect().intersects(window.close_button.get_rect()),"Close stays separate from primary action")
	check(not window.scroll.get_rect().intersects(window.header.get_rect()) and not window.scroll.get_rect().intersects(window.footer.get_rect()),"Only body scrolls between pinned header/footer")
	var header_before = window.title.get_global_rect()
	var footer_before = window.close_button.get_global_rect()
	window.scroll.scroll_vertical = 100000
	await settle()
	check(window.scroll.scroll_vertical > 0,"Long inspection content can scroll")
	check(header_before == window.title.get_global_rect() and footer_before == window.close_button.get_global_rect(),"Scrolling never moves header/footer")
	check(not window.scroll.get_h_scroll_bar().visible,"No horizontal scrolling")
	window.scroll.scroll_vertical = 0
	for _step in 4:
		for pressed in [true,false]:
			var event = InputEventMouseButton.new()
			event.position = window.scroll.get_global_rect().get_center()
			event.button_index = MOUSE_BUTTON_WHEEL_DOWN
			event.pressed = pressed
			root.push_input(event,true)
	await settle()
	check(window.scroll.scroll_vertical > 0,"Pointer scroll reaches the content through the decorative layers")
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

func run():
	root.gui_embed_subwindows = true
	root.size = Vector2i(480,900)
	if not OS.get_cmdline_user_args().is_empty(): output = OS.get_cmdline_user_args()[0]
	ui = load("res://scenes/main.tscn").instantiate()
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
	check(model.formula_lines(fighter,sample)[0] == "Дробящий урон: 3 + (Сила 1 − 1) = 3 × 2","Formula shows baseline subtraction rather than the inconsistent example arithmetic")
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
	ui._notification(Node.NOTIFICATION_WM_GO_BACK_REQUEST)
	await settle()
	check(is_instance_valid(character) and character.can_process() and ui.inspection_window == null,"Back closes only inspection and resumes tabs")
	click(character.pages[2].skills[0].get_global_rect().get_center())
	await settle()
	check(ui.inspection_window.cards[0].entry.kind == "skill","Learned skill opens same styled window")
	await shot("skill")
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
		ui.session.new_journey(1)
		for node in ui.session.game.journey.map.nodes:
			if node.kind == "forge": forge=node;break
		if not forge.is_empty(): break
	ui.session.game.journey.path = [forge.id]
	ui.session.game.journey.forgeResolved = false
	ui.session.game.journey.offers = ["shortsword@2"]
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
	for pixels in [Vector2i(480,900),Vector2i(896,800),Vector2i(1008,432),Vector2i(320,640),Vector2i(432,1008)]:
		root.size = pixels
		await settle()
		await geometry(window)
		check(ui.session.game == before and ui.inspection_window == window,"Folding preserves pending choice and the same window")
		check(window.columns.columns == (2 if window.panel.size.x >= 760 else 1),"Readable columns on wide screens, vertical comparison on narrow")
		await shot("comparison-%dx%d" % [pixels.x,pixels.y])
	ui.saves.fail = true
	window.confirmed.emit()
	await settle()
	check(window.visible and window.warning.text == ui.saves.error and ui.session.game == before,"Failed forge write keeps comparison and previous item")
	ui.saves.fail = false
	window.confirmed.emit()
	window.confirmed.emit()
	await settle()
	check(ui.session.game.journey.forgeResolved and ui.session.game.player.gear.weapon == "shortsword@2" and ui.inspection_window == null,"Forge confirmation equips once and closes inspection")
	check(ui.margin.can_process(),"Game input resumes after forge confirmation")
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
	check(window.column_slots.all(func(slot): return is_zero_approx(slot.offset_y)),"Narrow layout releases sticky offsets")
	check(window.groups[1].global_position.y >= window.groups[0].get_global_rect().end.y,"Narrow comparison stacks worn items below the offer")
	window.scroll.scroll_vertical = 0
	await shot("two-hands-narrow")
	ui.session.game.player.stats.strength = 10
	var unlocked = ui.offered_item("greatsword@10")
	window.refresh(unlocked.entries,unlocked.settings)
	check(window.footer_hint.text.begins_with("Заменит: ") and not window.primary.disabled,"Eligible offer restores replacement hint")
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
	print("INSPECTION: %s (%d checks; %d failures)" % ["PASS" if failures.is_empty() else "FAIL",checks,failures.size()])
	quit(0 if failures.is_empty() else 1)
