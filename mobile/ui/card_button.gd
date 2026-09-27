extends "res://ui/figure_input.gd"
var art
var card: Dictionary
var fighter: Dictionary
var modifiers: Dictionary = {}
var card_id = ""
var card_rotation = 0
var chosen = false
var placed = false
var cell_pitch = 36.0
var caption = Label.new()

func _init():
	mouse_default_cursor_shape = Control.CURSOR_DRAG
	add_child(caption)
	caption.mouse_filter = Control.MOUSE_FILTER_IGNORE
	caption.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	caption.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	caption.max_lines_visible = 2
	caption.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	caption.add_theme_font_size_override("font_size", 14)
	caption.add_theme_font_override("font", preload("res://content/fonts/GolosText.ttf"))
	resized.connect(queue_redraw)

func configure(renderer, definition: Dictionary, owner_fighter: Dictionary, mod: Dictionary):
	art = renderer
	card = definition
	card_id = card.id
	fighter = owner_fighter
	modifiers = mod
	caption.text = card.name
	caption.add_theme_color_override("font_color", art.data.color("text-primary"))
	caption.add_theme_color_override("font_outline_color", art.data.color("background-page"))
	queue_redraw()

func _draw():
	if not art: return
	var points = art.points(card, card_rotation, modifiers)
	var pitch = cell_pitch
	var extent = art.bounds(points) * pitch - Vector2.ONE * 3
	var reserved = 48 if caption.visible else 24
	var origin = Vector2((size.x - extent.x) / 2, 14 + (size.y - reserved - extent.y) / 2)
	art.piece(self, card, fighter, card_rotation, modifiers, origin, pitch, chosen)
	caption.position = Vector2(1, size.y - 32)
	caption.size = Vector2(maxf(0, size.x - 2), 32)
