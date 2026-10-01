extends Control
## Shared stone window and safe content inset for rewards, services and battle results.
const Layout = preload("res://ui/adaptive_layout.gd")
var surface = preload("res://ui/character_surface.gd").new()
var canvas = Control.new()

func _init():
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	canvas.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(surface)
	add_child(canvas)

func configure_panel(data):
	preload("res://ui/panel_shadow.gd").new().follow_panel(surface, data)
	surface.configure(data, 26, 0.68)
	arrange_panel()

func arrange_panel():
	var inset = 20.0
	# Keep the scroll area stable while the visible window rests at its bottom.
	surface.size = Vector2(size.x, minf(size.y, Layout.WINDOW_MAX_HEIGHT))
	surface.position = Vector2(0, size.y - surface.size.y)
	canvas.position = surface.position + Vector2.ONE * inset
	canvas.size = (surface.size - Vector2.ONE * inset * 2).max(Vector2.ONE)

func arrange_choice_separator(separator: Control, after_y: float) -> float:
	var spacing = clampf(canvas.size.y / 500, 0.5, 1.0)
	var y = after_y + 4 * spacing
	separator.position = Vector2(canvas.size.x * 0.08, y)
	separator.size = Vector2(canvas.size.x * 0.84, 10)
	return y + 10 + 8 * spacing

func footer_action_width(available_width: float) -> float:
	return minf(420, available_width * 0.9)
