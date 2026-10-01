extends RefCounted
## Shared canvas renderer for the hand, board layers and full-size drag ghost.
const CELL_GAP = 3.0
var data
var combat
var textures: Dictionary = {}
var current_art: Dictionary = {}
const PLAYER_FRAME = preload("res://content/ui/figure-player-frame.png")
const ENEMY_FRAME = preload("res://content/ui/figure-enemy-frame.png")

func _init(catalog, rules):
	data = catalog
	combat = rules
	register_art("base", data.base)
	for species in data.creatures:
		register_art("base", species.figures)
		for variant in species.get("variants", {}).values(): register_art("base", variant.figures)
	for equipment in data.items:
		register_art(equipment.id, equipment.get("figures", []), data.art.get(equipment.id, ""))

func register_art(prefix: String, figures: Array, fallback: String = ""):
	for figure in figures:
		var path = figure.get("art", fallback)
		if not path.is_empty(): current_art[prefix + ":" + figure.id] = path

func points(card: Dictionary, rotation: int, mod: Dictionary = {}) -> Array:
	return combat.cells(card, {"id": card.id, "x": 0, "y": 0, "rotation": rotation}, mod).map(func(i): return Vector2(i % 3, int(i / 3)))

func bounds(points_list: Array) -> Vector2:
	var extent = Vector2.ONE
	for point in points_list: extent = extent.max(point + Vector2.ONE)
	return extent

func pixel_extent(points_list: Array, pitch: float) -> Vector2:
	return bounds(points_list) * pitch - Vector2.ONE * CELL_GAP

func box(bg: String, border: String, radius: int = 3) -> StyleBoxFlat:
	var style = StyleBoxFlat.new()
	style.bg_color = data.color(bg)
	style.border_color = data.color(border)
	style.set_border_width_all(1)
	style.set_corner_radius_all(radius)
	return style

func number(value: float) -> String:
	return str(snappedf(value, 0.1)).trim_suffix(".0")

func damage(fighter: Dictionary, card: Dictionary) -> float:
	var total = 0.0
	for part in combat.parts(fighter, card): total += part.value
	return total

func symbol(card: Dictionary) -> String:
	if card.get("counter", false): return "↩"
	if card.get("blocks", false): return "▣"
	if card.get("evades", false): return "↗"
	if card.get("healing", 0) > 0 or card.get("healingMaxHealthPercent", 0) > 0: return "+"
	return "×"

func texture_for(card: Dictionary) -> Texture2D:
	var key: String = card.get("templateId", card.id).split("#")[0]
	# Saved mobile cards encode the item rank in their ID, without a source ID field.
	var source = key.get_slice(":", 0)
	if key.contains(":") and source.contains("@") and source.get_slice("@", 1).is_valid_int():
		key = source.get_slice("@", 0) + key.substr(source.length())
	var path: String = card.get("cellArt", current_art.get(key, card.get("art", "")))
	if card.get("skillId", "") and not card.has("cellArt"):
		var skill = data.lookup(data.skills, card.skillId)
		path = skill.get("figure", {}).get("art", skill.get("art", path))
	# Keep textures alive until the canvas command is rendered, not only during _draw.
	if not textures.has(path): textures[path] = load(path) if path.begins_with("res://") else data.image(path)
	return textures[path]

func display_actions(card: Dictionary) -> Array:
	var result: Array = []
	var seen: Array = []
	for action in combat.Actions.components(card):
		var key = str(action.get("cellArt",action.get("art","")))+symbol(action)
		if key not in seen:
			seen.append(key)
			result.append(action)
	return result

func source(canvas: CanvasItem, rect: Rect2, card: Dictionary):
	if card.has("cellComponents"):
		var actions = display_actions(card)
		for i in actions.size():
			var part_rect = Rect2(rect.position+Vector2(0,rect.size.y*i/actions.size()),Vector2(rect.size.x,rect.size.y/actions.size()))
			source(canvas,part_rect,actions[i])
		return
	var texture = texture_for(card)
	if texture:
		var extent = texture.get_size() * minf(rect.size.x / texture.get_width(), rect.size.y / texture.get_height())
		canvas.draw_texture_rect(texture, Rect2(rect.get_center() - extent / 2, extent), false)
	else:
		var font_size = int(rect.size.y * 0.55)
		canvas.draw_string(ThemeDB.fallback_font, rect.position + Vector2(0, rect.size.y * 0.7), symbol(card), HORIZONTAL_ALIGNMENT_CENTER, rect.size.x, font_size, data.color("text-highlight"))

func power(canvas: CanvasItem, rect: Rect2, hp: float, stamina: float):
	if hp <= 0 and stamina <= 0: return
	var font_size = clampi(int(rect.size.x * 0.24), 8, 16)
	var font = ThemeDB.fallback_font
	var a = number(hp)
	var b = number(stamina)
	var aw = font.get_string_size(a, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size).x
	var bw = font.get_string_size(b, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size).x
	var badge = Rect2(rect.end - Vector2(aw + bw + 9, font_size + 4), Vector2(aw + bw + 9, font_size + 4))
	canvas.draw_style_box(box("background-adventure-2", "border-adventure-5", 2), badge)
	canvas.draw_string(font, badge.position + Vector2(3, font_size), a, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size, data.color("text-danger"))
	canvas.draw_string(font, badge.position + Vector2(aw + 6, font_size), b, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size, data.color("text-success"))

func piece(canvas: CanvasItem, card: Dictionary, fighter: Dictionary, rotation: int, mod: Dictionary, origin: Vector2, pitch: float, selected: bool = false, cost_badge: bool = true, opponent: bool = false):
	var cells = points(card, rotation, mod)
	var maximum = float(card.get("staminaCost",0))
	for i in cells.size():
		var action = combat.placed_action(card,i,mod)
		var q = combat.concentration(action,mod)
		var hp = damage(fighter,action)*q
		var stamina = combat.stamina_damage_per_cell(fighter,action)*q
		maximum += action.get("blockCost",0)
		var rect = Rect2(origin + cells[i] * pitch, Vector2.ONE * (pitch - CELL_GAP))
		canvas.draw_texture_rect(ENEMY_FRAME if opponent else PLAYER_FRAME, rect, false, Color(1.15, 1.15, 1.15) if selected else Color.WHITE)
		source(canvas, rect.grow(-rect.size.x * 0.075), action)
		power(canvas, rect.grow(-1), hp, stamina)
	var cost = card.get("staminaCost", 0)
	if cost_badge and maximum > 0:
		var text = number(cost) + ("–" + number(maximum) if maximum > cost else "")
		var width = ThemeDB.fallback_font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, 13).x + 8
		var rect = Rect2(origin + Vector2(bounds(cells).x * pitch - width + 3, -9), Vector2(width, 20))
		canvas.draw_style_box(box("background-action-figures-4", "border-style-7-2"), rect)
		canvas.draw_string(ThemeDB.fallback_font, rect.position + Vector2(0, 15), text, HORIZONTAL_ALIGNMENT_CENTER, rect.size.x, 13, data.color("text-highlight"))
