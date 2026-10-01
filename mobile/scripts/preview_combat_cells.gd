extends "res://scripts/preview_portraits.gd"
## Visual fixture using the production board and figure dialogs. No saves or combat changes.
var mode_index = 0
var attack: Dictionary
var guard: Dictionary
var enemy_attack: Dictionary
var modes = ["Все состояния", "Бонусные клетки", "Скрытый ответ"]

func run():
	root.size = Vector2i(620,1000)
	await open_mode("combat")
	var g = ui.session.game
	g.player.gear = {"weapon":"dagger","shield":"buckler","feet":"iron-boots","body":null}
	var cards = ui.session.combat.build_deck(g.player)
	attack = cards.filter(func(c): return c.get("sourceKind","") == "weapon")[0].duplicate(true)
	guard = cards.filter(func(c): return c.get("blocks",false))[0].duplicate(true)
	enemy_attack = ui.session.combat.build_deck(g.enemy).filter(func(c): return c.category == "attack")[0].duplicate(true)
	# Individual cells of larger figures are shown at their usual field scale.
	for card in [attack,guard,enemy_attack]: card.shape = [[0,0]]
	var view = ui.combat_view
	view.board.interactive = true
	for connection in view.board.drag_started.get_connections(): view.board.drag_started.disconnect(connection.callable)
	for connection in view.skip.pressed.get_connections(): view.skip.pressed.disconnect(connection.callable)
	for connection in view.action.pressed.get_connections(): view.action.pressed.disconnect(connection.callable)
	view.skip.pressed.connect(func(): mode_index = (mode_index+2)%3; present())
	view.action.pressed.connect(func(): mode_index = (mode_index+1)%3; present())
	view.skip.text = "← Вариант"
	view.action.text = "Вариант →"
	view.skip.disabled = false
	view.action.disabled = false
	present()
	root.title = "Орвеск — варианты клеток боя (превью)"
	print("COMBAT_CELLS_PREVIEW_READY")

func combo(id: String, pending: bool = false) -> Dictionary:
	var rule = ui.data.lookup(ui.data.combos.rules,id)
	return {"id":id,"name":rule.name,"description":rule.description,"active":not pending,"pending":pending,"links":[[4,5]]}

func present():
	var view = ui.combat_view
	var board = view.board
	var own: Array = [{},{},attack,attack,attack,attack,guard,{},{}]
	var other: Array = [{},enemy_attack,{},enemy_attack,{},enemy_attack,enemy_attack,enemy_attack,guard]
	var records: Array = []
	for n in 9:
		records.append({"index":n,"known":mode_index != 2,"player":own[n],"enemy":other[n],
			"playerDamage":0,"enemyDamage":0,"playerStaminaDamage":0,"enemyStaminaDamage":0,
			"playerCombos":[],"enemyCombos":[],"potential":3,"potentialStamina":0})
	if mode_index == 0:
		for n in [4,5]: records[n].playerCombos = [combo("breach")]
		records[7].enemyCombos = [combo("breach")]
		records[2].enemyDamage = 3
		records[3].enemyDamage = 1.5
		records[3].playerDamage = 1.5
		view.hint.text = "Слева направо, сверху вниз:\n1 Пусто · 2 Враг · 3 Герой\n4 Две фигуры · 5 Комбинация героя · 6 Комбинация + враг\n7 Блок против атаки · 8 Комбинация врага без эффектов · 9 Блок врага\nУдерживайте клетку, чтобы открыть описание."
	elif mode_index == 1:
		var bonus_guard = guard.duplicate(true)
		bonus_guard.comboBonus = true
		bonus_guard.name = "Защитный угол"
		var bonus_attack = attack.duplicate(true)
		bonus_attack.comboBonus = true
		bonus_attack.name = "Окружение"
		for n in [4,5]:
			own[n] = bonus_guard if n == 4 else bonus_attack
			records[n].player = own[n]
			records[n].playerCombos = [combo("defensive-corner" if n == 4 else "surround")]
		view.hint.text = "Средний ряд: обычное столкновение, бонусный блок, бонусная атака против врага.\nВерхний и нижний ряды оставлены для сравнения.\nУдерживайте клетку: бонусная фигура и описание комбинации."
	else:
		other = [{},{},{},{},{},{},{},{},{}]
		for n in 9: records[n].enemy = {}
		for n in [4,5]: records[n].playerCombos = [combo("covered-strike",true)]
		view.hint.text = "Ответ противника скрыт.\nЗолотые клетки — подготовленная комбинация: условие пока не подтверждено.\nУдерживайте клетку, чтобы увидеть пояснение."
	board.configure(view.art,own,other,mode_index == 2,ui.session.game.player,ui.session.game.enemy)
	board.damage_cells = records
	board.queue_redraw()
	view.header.title.text = "Превью · " + modes[mode_index]
	view.header.layout()
	for card in view.cards: card.hide()
	view.hint.show()
	view.hint.mouse_filter = Control.MOUSE_FILTER_IGNORE
	view.hint.add_theme_font_size_override("font_size",14)
	view.hint.position = view.hand.position
	view.hint.size = view.hand.size
	view.resized.connect(arrange_hint) if not view.resized.is_connected(arrange_hint) else null

func arrange_hint():
	ui.combat_view.hint.position = ui.combat_view.hand.position
	ui.combat_view.hint.size = ui.combat_view.hand.size
