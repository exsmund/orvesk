extends "res://ui/figure_input.gd"
signal cell_chosen(index: int)
signal card_dropped(id: String, index: int)
var art
var data
var player_layer: Array = []
var enemy_layer: Array = []
var preview: Array = []
var preview_card: Dictionary = {}
var preview_valid = true
var enemy_hidden = false
var player: Dictionary
var enemy: Dictionary
var terrain: Texture2D
const BACKGROUND = preload("res://content/ui/board-v2.png")
const PLAYER_CELL = preload("res://content/ui/cell-player-v2.png")
const ENEMY_CELL = preload("res://content/ui/cell-enemy-v2.png")
const CONTESTED_CELL = preload("res://content/ui/cell-contested-v2.png")
# Map the painted rail centres onto an even lattice, keeping the transparent perimeter.
# Coordinates refer to the source PNG before Godot import scaling.
const BOARD_SOURCE_SIZE = Vector2(1254,1254)
const SOURCE_X = [0,35,425,829,1219,1254]
const SOURCE_Y = [0,35,421,819,1209,1254]
const GRID_AXES = [0,36,430,824,1218,1254]
const CELL_X = [Vector2(48,418),Vector2(442,812),Vector2(836,1206)]
const CELL_Y = CELL_X
const Symbols = preload("res://ui/resource_symbols.gd")
const Illustration = preload("res://ui/cell_art.gd")
var icons: Array[Control] = []
var drawing_index = 0
var player_modifiers: Dictionary = {}
var enemy_modifiers: Dictionary = {}
var damage_cells: Array = []
var combo_contested: Texture2D
var combo_cell: Texture2D
var combo_link: Texture2D
var combo_glow: Texture2D

func player_combos(index: int) -> Array:
	if index >= damage_cells.size(): return []
	return damage_cells[index].get("playerCombos",[]).filter(func(c): return c.active or c.pending)

func combo_half(rect: Rect2, contested: bool) -> Rect2:
	var result = rect.grow(-5)
	if contested: result.size.x = (result.size.x-3)/2
	return result

func draw_combos():
	var seen = {}
	for n in 9:
		for combo in player_combos(n):
			for link in combo.links:
				var key = str(mini(link[0],link[1]))+":"+str(maxi(link[0],link[1]))
				if seen.has(key): continue
				seen[key] = true
				var a = cell_rect(link[0])
				var b = cell_rect(link[1])
				var center = (a.get_center()+b.get_center())/2
				# Between rows keep the clasp over the player's half in a contested cell.
				if link[0]%3 == link[1]%3:
					if not enemy_layer[link[0]].is_empty() or not enemy_layer[link[1]].is_empty(): center.x -= a.size.x*0.23
				var extent = Vector2.ONE*size.x*0.063
				draw_texture_rect(combo_link,Rect2(center-extent/2,extent),false)


func _init():
	mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	resized.connect(queue_redraw)
	for _i in 18:
		var icon = Illustration.new()
		icon.custom_minimum_size = Vector2.ZERO
		# Keep the soft shadow inside its half-cell, clear of rails and damage counters.
		icon.clip_contents = true
		add_child(icon)
		icons.append(icon)
	held.connect(func(point): cell_chosen.emit(index_at(point - global_position)))

func configure(renderer, own: Array, opposing: Array, hidden: bool, hero: Dictionary, opponent: Dictionary, own_mod: Dictionary = {}, opposing_mod: Dictionary = {}):
	art = renderer
	data = art.data
	combo_cell = data.image(data.combos.art.cell)
	combo_contested = data.image(data.combos.art.contested)
	combo_link = data.image(data.combos.art.link)
	if not combo_glow:
		var gradient = Gradient.new()
		gradient.colors = PackedColorArray([Color(data.color("text-accent"),0.52),Color(data.color("text-accent"),0)])
		var texture = GradientTexture2D.new()
		texture.gradient = gradient
		texture.fill = GradientTexture2D.FILL_RADIAL
		texture.fill_from = Vector2(0.5,0.5)
		texture.fill_to = Vector2(0.95,0.5)
		combo_glow = texture
	player_layer = own
	enemy_layer = opposing
	enemy_hidden = hidden
	player = hero
	enemy = opponent
	player_modifiers = own_mod
	enemy_modifiers = opposing_mod
	terrain = BACKGROUND
	queue_redraw()

func index_at(point: Vector2) -> int:
	if not Rect2(Vector2.ZERO, size).has_point(point): return -1
	var source = point * BOARD_SOURCE_SIZE / size
	var column = 0
	var row = 0
	for divider in 2:
		if source.x >= (CELL_X[divider].y+CELL_X[divider+1].x)/2: column += 1
		if source.y >= (CELL_Y[divider].y+CELL_Y[divider+1].x)/2: row += 1
	return row * 3 + column

func cell_rect(index: int) -> Rect2:
	var x = CELL_X[index % 3]
	var y = CELL_Y[int(index / 3)]
	var factor = size / BOARD_SOURCE_SIZE
	return Rect2(Vector2(x.x,y.x)*factor,Vector2(x.y-x.x,y.y-y.x)*factor)

func draw_background():
	# Small UV corrections align all sixteen studs with the cell corners without
	# cropping the frame or stretching an occupied square into a half-cell.
	for y in 5:
		for x in 5:
			var points = PackedVector2Array()
			var uv = PackedVector2Array()
			for corner in [Vector2i(x,y),Vector2i(x+1,y),Vector2i(x+1,y+1),Vector2i(x,y+1)]:
				points.append(Vector2(GRID_AXES[corner.x],GRID_AXES[corner.y])*size/BOARD_SOURCE_SIZE)
				uv.append(Vector2(SOURCE_X[corner.x],SOURCE_Y[corner.y])/BOARD_SOURCE_SIZE)
			draw_colored_polygon(points,Color.WHITE,uv,BACKGROUND)

func draw_cell(rect: Rect2, texture: Texture2D):
	# Leave the board's diamond studs visible at the intersections as well as its rails.
	var cut = Vector2.ONE * 10 * size / BOARD_SOURCE_SIZE
	var extent = rect.size
	var local_points = PackedVector2Array([
		Vector2(cut.x,0),Vector2(extent.x-cut.x,0),Vector2(extent.x,cut.y),
		Vector2(extent.x,extent.y-cut.y),Vector2(extent.x-cut.x,extent.y),
		Vector2(cut.x,extent.y),Vector2(0,extent.y-cut.y),Vector2(0,cut.y)])
	var points = PackedVector2Array()
	var uv = PackedVector2Array()
	for point in local_points:
		points.append(rect.position+point)
		uv.append(point/extent)
	draw_colored_polygon(points,Color.WHITE,uv,texture)

func draw_layer(rect: Rect2, card: Dictionary, own: bool, contested: bool = false):
	if card.is_empty(): return
	var frame = rect.grow(-5)
	if contested:
		frame.size.x = (frame.size.x - 3) / 2
		if not own: frame.position.x += frame.size.x + 3
	var art_rect = Rect2(frame.position + Vector2(3, 3), Vector2(frame.size.x - 6, frame.size.y - 43))
	var icon = icons[drawing_index * 2 + (0 if own else 1)]
	icon.position = art_rect.position
	icon.size = art_rect.size
	icon.configure(art,card)
	icon.show()
	if enemy_hidden and not art.combat.is_strike(card) and not card.get("counter", false):
		var caption = "Блок" if card.get("blocks", false) else ("Уворот" if card.get("evades", false) else "Атака")
		draw_string(ThemeDB.fallback_font, Vector2(frame.position.x, frame.end.y - 7), caption, HORIZONTAL_ALIGNMENT_CENTER, frame.size.x, 11, data.color("text-success" if own else "text-accent"))

func damage_rows(cell: Dictionary, side: String) -> Array:
	var rows: Array = []
	var estimated = not cell.get("known", false)
	if estimated and side != "enemy": return rows
	# The snapshot stores losses by recipient; the opposite figure deals them.
	var source = cell.get("enemy" if side == "player" else "player", {})
	var attacks = source.get("category", "") == "attack" or source.get("counter", false)
	for spec in [["health", "Damage"], ["stamina", "StaminaDamage"]]:
		var key = ("previewDamage" if spec[0] == "health" else "previewStaminaDamage") if estimated else side + spec[1]
		var value = float(cell.get(key, 0))
		var has_damage = art.combat.Actions.components(source).any(func(action): return not action.get("healthDamage",{}).is_empty()) if spec[0] == "health" else art.combat.Actions.components(source).any(func(action): return action.get("staminaDamagePerCell",0)>0 or action.has("staminaDamage"))
		if value > 0 or (attacks and has_damage): rows.append({"kind": spec[0], "value": value})
	return rows

func draw_damage(rect: Rect2, cell: Dictionary):
	for side in ["player", "enemy"]:
		var rows = damage_rows(cell, side)
		if rows.is_empty(): continue
		var width = rect.size.x * 0.47
		var font_size = clampi(int(rect.size.x * 0.085), 9, 12)
		var icon_size = float(font_size)
		var line_height = font_size + 3
		# Keep the loss next to the figure that causes it, including a blocked zero.
		var offset = rect.size.x * (0.02 if side == "enemy" else 0.51)
		var tint = data.color("text-success" if side == "player" else "text-accent")
		if not cell.get("known", false):
			width = rect.size.x * 0.96
			offset = rect.size.x * 0.02
			tint = data.color("text-success")
		var font = preload("res://ui/gothic_theme.gd").BODY_FONT
		for line in rows.size():
			var text = ("−" if rows[line].value > 0 else "") + art.number(rows[line].value)
			var text_width = font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size).x
			var left = rect.position.x + offset + maxf(0, (width - text_width - icon_size - 3) / 2)
			var y = rect.end.y - maxf(14, rect.size.y * 0.09) - (rows.size() - 1 - line) * line_height
			Symbols.paint(self, Rect2(left, y - icon_size, icon_size, icon_size), rows[line].kind, tint)
			draw_string(font, Vector2(left + icon_size + 3, y), text, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size, tint)

func _draw():
	if not art: return
	draw_background()
	for i in 9:
		drawing_index = i
		var rect = cell_rect(i)
		var own = player_layer[i] if player_layer.size() > i else {}
		var opposing = enemy_layer[i] if enemy_layer.size() > i else {}
		var projected = i in preview and preview_valid
		icons[i * 2].visible = not own.is_empty() or projected
		icons[i * 2 + 1].visible = not opposing.is_empty()
		var has_player = not own.is_empty() or projected
		var combined = not player_combos(i).is_empty()
		if has_player or not opposing.is_empty():
			var texture: Texture2D
			if has_player and not opposing.is_empty():
				# One complete two-panel asset: no nested green/gold frame and
				# no horizontally squeezed square stone on the player's half.
				texture = combo_contested if combined else CONTESTED_CELL
			else:
				texture = (combo_cell if combined else PLAYER_CELL) if has_player else ENEMY_CELL
			draw_cell(rect, texture)
		if combined:
			var glow_rect = combo_half(rect,not opposing.is_empty()) if not opposing.is_empty() else rect
			draw_texture_rect(combo_glow,glow_rect.grow(-5),false)
		draw_layer(rect, own, true, not opposing.is_empty())
		draw_layer(rect, opposing, false, has_player)
		if i in preview:
			if preview_valid: draw_layer(rect, art.combat.placed_action(preview_card,preview.find(i),player_modifiers), true, not opposing.is_empty())
			else: draw_rect(rect.grow(-3), data.color("border-reaction-board-2-2"), false, 2)
		if damage_cells.size() > i: draw_damage(rect, damage_cells[i])

	draw_combos()
