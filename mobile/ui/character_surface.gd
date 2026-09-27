extends Control
## The window, header and navigation share the same stone at the same grain scale.
const STONE = preload("res://content/ui/character-slate-v1.png")
const Frame = preload("res://ui/texture_frame.gd")
var frame = Frame.new()
var brightness = 1.0

func _init():
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	texture_repeat = CanvasItem.TEXTURE_REPEAT_ENABLED
	resized.connect(queue_redraw)

func configure(data, edge: float = 20, intensity: float = 1.0):
	brightness = intensity
	add_child(frame)
	frame.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	frame.configure(data, edge)
	queue_redraw()

func _draw():
	draw_texture_rect_region(STONE, Rect2(Vector2.ZERO, size), Rect2(Vector2.ZERO, size * 1.35), Color(brightness, brightness, brightness))
