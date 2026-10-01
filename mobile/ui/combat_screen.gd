extends Control
## Fixed viewport layout. Resizing moves existing controls without rebuilding the turn.
const Header = preload("res://ui/game_header.gd")
const Board = preload("res://ui/board.gd")
const Card = preload("res://ui/card_button.gd")
const FigureArt = preload("res://ui/figure_art.gd")
const Layout = preload("res://ui/adaptive_layout.gd")
var host
var art
var header = Header.new()
var board = Board.new()
var hand = Control.new()
var phase_label = header.title
var hint = Label.new()
var status = Label.new()
var action = Button.new()
var skip = Button.new()
var ghost = Control.new()
var cards: Array = []
var columns = 1
var hand_columns = 4
var drag_id = ""
var drag_source: Control
var drag_rotation = 0
var drag_point = Vector2.ZERO
var drag_offset = Vector2.ZERO
var drop_index = -1
var drop_valid = false
var last_layout_size = Vector2.ZERO
var forecast: Dictionary = {}
var transition_busy = false
var dealing = false
var deal_elapsed = 0.0
var shake_offset = Vector2.ZERO
var hand_slots: Dictionary = {}
var deal_order: Array = []
var press_depth = 0.0
var press_motion: Tween
const DEAL_DURATION = 0.28
const DEAL_STAGGER = 0.09


func _init():
	for node in [header, board, hand, hint, status, skip, action, ghost]: add_child(node)
	for node in [hint, status]:
		node.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		node.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		node.clip_text = true
		node.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hint.add_theme_font_size_override("font_size", 12)
	status.add_theme_font_size_override("font_size", 14)
	hint.hide()
	hand.mouse_filter = Control.MOUSE_FILTER_IGNORE
	action.add_theme_font_size_override("font_size", preload("res://ui/gothic_theme.gd").button_text_size(19))
	action.add_theme_font_override("font", preload("res://content/fonts/Prata-Regular.ttf"))
	skip.text = "Пропустить ход"
	skip.theme_type_variation = "SecondaryButton"
	for button in [skip, action]:
		button.clip_text = true
		button.add_theme_font_override("font", preload("res://content/fonts/Prata-Regular.ttf"))
	ghost.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ghost.z_index = 10
	ghost.draw.connect(draw_ghost)
	resized.connect(layout)

func configure(controller):
	host = controller
	art = FigureArt.new(host.data, host.session.combat)
	header.configure(host.data, host.session.game)
	header.player_requested.connect(host.show_character)
	header.enemy_requested.connect(host.show_enemy_details)
	board.cell_chosen.connect(inspect_cell)
	board.card_dropped.connect(func(id, index): host.place_card(id, index, host.rotation_for(id)))
	board.drag_started.connect(func(point):
		var index = board.index_at(point - board.global_position)
		if index >= 0 and not board.player_layer[index].is_empty(): start_drag(board.player_layer[index].id, point, board))
	board.drag_moved.connect(func(point):
		if drag_source == board: move_drag(point))
	board.drag_ended.connect(func(point, canceled):
		if drag_source == board: end_drag(point, canceled))
	for card in host.session.game.player.deck.hand:
		var view = Card.new()
		hand.add_child(view)
		view.configure(art, card, host.session.game.player, host.session.game.clashPlan.playerModifiers)
		view.tapped.connect(func(_point): host.rotate_card(card.id))
		view.held.connect(func(_point): host.show_figure_details(card, host.session.game.player))
		view.drag_started.connect(func(point): start_drag(card.id, point, view))
		view.drag_moved.connect(func(point):
			if drag_source == view: move_drag(point))
		view.drag_ended.connect(func(point, canceled):
			if drag_source == view: end_drag(point, canceled))
		cards.append(view)
	action.pressed.connect(func():
		if action.disabled: return
		if host.session.game.clashPlan.stage == "reveal": host.act(func(): return host.session.submit([]))
		else:
			var committed = host.draft.duplicate(true)
			host.act(func(): return host.session.submit(committed)))
	skip.pressed.connect(func():
		if not can_skip(): return
		host.act(func(): return host.session.submit([])))
	hint.add_theme_color_override("font_color", host.data.color("text-muted"))
	action.add_theme_color_override("font_color", host.data.color("text-highlight"))
	skip.add_theme_color_override("font_color", host.data.color("text-highlight"))
	restore_hand_slots({})
	refresh()
	layout()

func inspect_cell(index: int):
	if index < 0 or index >= board.player_layer.size(): return
	var entries: Array = []
	if not board.player_layer[index].is_empty():
		entries.append(cell_entry(board.player_layer[index],host.session.game.player,board.damage_cells[index].get("playerCombos",[])))
	if index < board.enemy_layer.size() and not board.enemy_layer[index].is_empty():
		entries.append(cell_entry(board.enemy_layer[index],host.session.game.enemy,board.damage_cells[index].get("enemyCombos",[])))
	if not entries.is_empty(): host.show_figure_cards(entries)

func cell_entry(action: Dictionary, fighter: Dictionary, combos: Array) -> Dictionary:
	var card = action
	var description = ""
	if action.has("cellIndex") or action.has("cellComponents"):
		for pile in ["hand","draw","discard"]:
			for figure in fighter.deck[pile]:
				if figure.id == action.id: card = figure
		description = "В этой клетке: "+", ".join(art.display_actions(action).map(func(part): return part.name))+"."
		if action.has("cellComponents"): description += " Фигура сжата: все её действия собраны в одной клетке."
	return {"card":card,"fighter":fighter,"combos":combos,"cellDescription":description}

func refresh():
	var g = host.session.game
	var p = g.clashPlan
	var revealed = p.stage == "reveal"
	var moves = p.playerPlaced if revealed else host.draft
	var visible_enemy = p.enemyPlaced if p.preparer == "enemy" or revealed else []
	var opposing = host.session.combat.layer(g.enemy, visible_enemy, p.enemyModifiers)
	var own_moves = moves.filter(func(m): return m.id != drag_id)
	board.configure(art, host.session.combat.layer(g.player, own_moves, p.playerModifiers), opposing, p.preparer == "player" and not revealed, g.player, g.enemy, p.playerModifiers, p.enemyModifiers)
	update_forecast(moves)
	action.text = "Следующий ход" if revealed else "Подтвердить ход"
	action.disabled = not can_confirm()
	skip.disabled = not can_skip()
	hint.hide()
	for card in cards:
		card.card_rotation = host.rotation_for(card.card_id)
		card.chosen = host.selected == card.card_id
		card.placed = moves.any(func(m): return m.id == card.card_id)
		card.visible = not card.placed
		card.queue_redraw()
	layout()

func can_confirm() -> bool:
	if transition_busy: return false
	if host.session.game.clashPlan.stage == "reveal": return true
	return forecast.get("cost", {}).get("remaining", 0) >= 0 and not can_skip()

func can_skip() -> bool:
	var g = host.session.game
	return not transition_busy and g.phase == "combat" and g.clashPlan.stage != "reveal" and host.draft.is_empty() and g.clashPlan.playerPlaced.is_empty() and g.player.stamina < host.data.max_stamina(g.player)

func update_forecast(moves: Array):
	forecast = host.session.combat.forecast(host.session.game, moves)
	header.configure(host.data, host.session.game, forecast)
	board.damage_cells = forecast.cells
	# Use the public snapshot, including bonus cells, without exposing hidden plans.
	board.player_layer = forecast.cells.map(func(cell): return cell.player)
	board.enemy_layer = forecast.cells.map(func(cell): return cell.enemy)
	board.queue_redraw()
	status.text = "Недостаточно сил" if forecast.cost.remaining < 0 else ""
	status.visible = not status.text.is_empty()
	status.add_theme_color_override("font_color", host.data.color("text-danger" if forecast.cost.remaining < 0 else "text-muted"))

func set_notice(text: String):
	if text.is_empty(): refresh(); return
	status.text = text
	status.show()
	status.add_theme_color_override("font_color", host.data.color("text-danger"))

func layout():
	if not host or size.x < 1 or size.y < 1: return
	if size != last_layout_size:
		last_layout_size = size
		board.cancel_gesture()
		for card in cards: card.cancel_gesture()
		last_layout_size = size
	var gap = Layout.CONTENT_GAP
	var header_height = Header.HEIGHT
	var footer_height = Layout.COMBAT_FOOTER_HEIGHT
	header.position = Vector2.ZERO
	header.size = Vector2(size.x, header_height)
	var top = header_height + gap
	var body_height = Layout.battle_body_height(size.y)
	columns = Layout.columns(size.x)
	var hand_height = clampf(size.y * 0.19, 124, 180)
	if columns == 1:
		var extent = maxf(0, minf(size.x, body_height - hand_height - gap))
		var start = top + maxf(0, (body_height - extent - hand_height - gap - 24) / 2)
		board.position = Vector2((size.x - extent) / 2, start)
		board.size = Vector2.ONE * extent
		hand.position = Vector2(0, board.position.y + extent + gap)
		hand.size = Vector2(size.x, hand_height)
	else:
		# Keep two equal lanes together even when the window is much wider than tall.
		var extent = minf((size.x - gap) / 2, body_height)
		var start = (size.x - extent * 2 - gap) / 2
		board.position = Vector2(start, top + (body_height - extent) / 2)
		board.size = Vector2.ONE * extent
		hand_height = extent
		hand.position = Vector2(start + extent + gap, top + (body_height - hand_height) / 2)
		hand.size = Vector2(extent, hand_height)
	hint.position = Vector2(hand.position.x, hand.position.y + hand.size.y)
	hint.size = Vector2.ZERO
	hand_columns = 4 if columns == 1 else 2
	var slot = hand.size.x / hand_columns
	var slot_height = hand_height if columns == 1 else hand_height / 2
	var span = 1.0
	# One scale for the whole hand, stable when any piece rotates or is compressed.
	for card in cards:
		var extent = art.bounds(art.points(card.card, 0))
		span = maxf(span, maxf(extent.x, extent.y))
	# Beside the board, use the full 2×2 lane instead of the compact phone cap.
	var max_pitch = 48.0 if columns == 1 else board.size.x / 3
	var pitch = minf(max_pitch, minf((slot - 16) / span, (slot_height - 48) / span))
	for card in cards:
		card.cell_pitch = pitch
		card.size = Vector2(slot, slot_height)
		if card.visible:
			var slot_index: int = hand_slots.get(card.card_id, 0)
			card.position = Vector2((slot_index % hand_columns) * slot, int(slot_index / hand_columns) * slot_height)
			if dealing and card.card_id in deal_order:
				var progress = clampf((deal_elapsed - deal_order.find(card.card_id) * DEAL_STAGGER) / DEAL_DURATION, 0.0, 1.0)
				var distance = get_viewport_rect().size.y - hand.global_position.y + card.size.y
				card.position.y += distance * pow(1.0 - progress, 3)
		card.queue_redraw()
	status.position = Vector2(hand.position.x, size.y - footer_height)
	status.size = Vector2(hand.size.x, 24)
	var action_width = (hand.size.x - gap) / 2
	place_action(skip, Vector2(hand.position.x, size.y - 54), action_width)
	place_action(action, Vector2(hand.position.x + action_width + gap, size.y - 54), action_width)
	board.pivot_offset = board.size / 2
	board.scale = Vector2.ONE * (1.0 - press_depth * 0.018)
	board.position += shake_offset + Vector2(0, press_depth * 4.0)
	ghost.position = Vector2.ZERO
	ghost.size = size
	ghost.queue_redraw()

func place_action(button: Button, origin: Vector2, width: float):
	preload("res://ui/gothic_theme.gd").fit_button_text(button, width, 19)
	button.position = origin
	button.size = Vector2(width, 54)

func start_drag(id: String, point: Vector2, source):
	if transition_busy or host.session.game.clashPlan.stage == "reveal" or not drag_id.is_empty(): return
	if host.session.combat.card_by_id(host.session.game.player,id).is_empty(): return
	drag_id = id
	drag_source = source
	drag_rotation = host.rotation_for(id)
	host.selected = id
	host.card_rotation = drag_rotation
	var pitch = board.size.x / 3
	var card = host.session.combat.card_by_id(host.session.game.player, id)
	var extent = art.pixel_extent(art.points(card, drag_rotation, host.session.game.clashPlan.playerModifiers), pitch)
	# Hold the whole visible figure by its bottom center, regardless of grab cell.
	# The same origin drives the ghost, target cells and damage preview.
	drag_offset = Vector2(extent.x / 2, extent.y)
	refresh()
	move_drag(point)

func move_drag(point: Vector2):
	if drag_id.is_empty(): return
	drag_point = point
	var target = point - drag_offset + Vector2.ONE * (board.size.x / 6)
	drop_index = board.index_at(target - board.global_position)
	var removing = drag_source == board and not board.get_global_rect().has_point(point)
	drop_valid = not removing and drop_index >= 0 and host.can_place_card(drag_id, drop_index, drag_rotation)
	board.preview = []
	board.preview_card = host.session.combat.card_by_id(host.session.game.player, drag_id)
	board.preview_valid = drop_valid
	if drop_index >= 0 and not removing:
		board.preview = host.session.combat.cells(board.preview_card, {"id": drag_id, "x": drop_index % 3, "y": int(drop_index / 3), "rotation": drag_rotation}, host.session.game.clashPlan.playerModifiers)
	var moves = host.draft
	if removing or drop_valid:
		moves = host.draft.filter(func(m): return m.id != drag_id)
	if drop_valid:
		moves.append({"id": drag_id, "x": drop_index % 3, "y": int(drop_index / 3), "rotation": drag_rotation})
	update_forecast(moves)
	board.queue_redraw()
	ghost.queue_redraw()

func end_drag(point: Vector2, canceled: bool):
	if drag_id.is_empty(): return
	move_drag(point)
	var id = drag_id
	var index = drop_index
	var rotation = drag_rotation
	var valid = drop_valid
	var removing = drag_source == board and not board.get_global_rect().has_point(point)
	drag_id = ""
	drag_source = null
	board.preview = []
	board.preview_card = {}
	drop_index = -1
	drop_valid = false
	ghost.queue_redraw()
	refresh()
	if canceled: return
	if removing: host.remove_card(id)
	elif valid:
		if host.place_card(id, index, rotation): press_board()
	elif index >= 0: set_notice("Фигура пересекается с другой или выходит за край")

func draw_ghost():
	if drag_id.is_empty(): return
	# Over a legal target the board itself draws the large, precisely fitted preview.
	# Keep the free-moving hand texture from covering its calibrated cell boundaries.
	if drop_valid: return
	var card = host.session.combat.card_by_id(host.session.game.player, drag_id)
	if card.is_empty(): return
	ghost.modulate.a = 0.76
	art.piece(ghost, card, host.session.game.player, drag_rotation, host.session.game.clashPlan.playerModifiers, drag_point - global_position - drag_offset, board.size.x / 3, true, false)

func set_transition_busy(value: bool):
	transition_busy = value
	board.cancel_gesture()
	board.interactive = not value
	for card in cards:
		card.cancel_gesture()
		card.interactive = not value
	action.disabled = not can_confirm()
	skip.disabled = not can_skip()

func shake_board():
	var motion = create_tween()
	motion.tween_method(func(progress: float):
		shake_offset = Vector2(sin(progress * TAU * 4), cos(progress * TAU * 3) * 0.45) * 4.0 * (1.0 - progress)
		layout(), 0.0, 1.0, 0.32)
	motion.tween_callback(func(): shake_offset = Vector2.ZERO; layout())

func restore_hand_slots(retained: Dictionary):
	hand_slots = {}
	for card in cards:
		if retained.has(card.card_id): hand_slots[card.card_id] = retained[card.card_id]
	for card in cards:
		if hand_slots.has(card.card_id): continue
		var slot = 0
		while slot in hand_slots.values(): slot += 1
		hand_slots[card.card_id] = slot
	layout()

func press_board():
	if press_motion and press_motion.is_valid(): press_motion.kill()
	press_motion = create_tween()
	press_motion.tween_method(func(depth: float): press_depth = depth; layout(), press_depth, 1.0, 0.07)
	press_motion.tween_method(func(depth: float): press_depth = depth; layout(), 1.0, 0.0, 0.15).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)

func animate_deal(retained: Dictionary = {}):
	restore_hand_slots(retained)
	deal_order = []
	for card in cards:
		if not retained.has(card.card_id): deal_order.append(card.card_id)
	if deal_order.is_empty(): return
	dealing = true
	deal_elapsed = 0.0
	set_transition_busy(true)
	layout()
	var motion = create_tween()
	var duration = DEAL_DURATION + DEAL_STAGGER * (deal_order.size() - 1)
	motion.tween_method(func(elapsed: float): deal_elapsed = elapsed; layout(), 0.0, duration, duration)
	motion.tween_callback(func():
		dealing = false
		layout()
		set_transition_busy(false))
