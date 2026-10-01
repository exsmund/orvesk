extends Control
## Number first; the visible shard silhouette is slightly taller than the visible numerals, centered on their ink bounds.
const GothicTheme = preload("res://ui/gothic_theme.gd")
var prefix = ""
var text_shadow = Color.TRANSPARENT
var alignment = HORIZONTAL_ALIGNMENT_RIGHT
var amount = 0
# Presentation only; amount always remains the committed balance.
var displayed_amount: int = 0:
	set(value):
		displayed_amount = value
		queue_redraw()
var icon: Texture2D
var tint = Color.WHITE
var font_size = 28
var icon_scale = 1.24
var group_digits = false
var icon_rect = Rect2()
var number_rect = Rect2()
static var numeral_bounds: Dictionary = {}

func _init():
	texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	resized.connect(queue_redraw)

func configure(data, value: int):
	amount = value
	displayed_amount = value
	icon = GothicTheme.trim_texture(data.image("/ui/logos-shards.png"))
	tint = data.color("text-home")
	tooltip_text = "Осколки: %d" % amount
	queue_redraw()

func _draw():
	if not icon: return
	var font = GothicTheme.DISPLAY_FONT
	var digits = str(displayed_amount)
	if group_digits:
		var end = digits.length() - 3
		while end > (1 if displayed_amount < 0 else 0):
			digits = digits.insert(end, " ")
			end -= 3
	var text = prefix + digits
	var fitted = font_size
	while fitted > 1 and font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, fitted).x + fitted * icon_scale + 8 > size.x: fitted -= 1
	var width = font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, fitted).x
	# Glyph texture bounds include MSDF padding; contour bounds measure the visible ink.
	if not numeral_bounds.has(fitted):
		var server = TextServerManager.get_primary_interface()
		var rid = font.get_rids()[0]
		var glyph = server.font_get_glyph_index(rid, fitted, "0".unicode_at(0), 0)
		var points = server.font_get_glyph_contours(rid, fitted, glyph).get("points", PackedVector3Array())
		var low = Vector2(INF, INF)
		var high = Vector2(-INF, -INF)
		for point in points:
			low = low.min(Vector2(point.x, point.y))
			high = high.max(Vector2(point.x, point.y))
		numeral_bounds[fitted] = Rect2(low, high - low) if not points.is_empty() else Rect2(0, -fitted * 0.8, fitted, fitted * 0.8)
	var bounds: Rect2 = numeral_bounds[fitted]
	var height = bounds.size.y
	var icon_height = height * icon_scale
	var extent = Vector2(icon_height * icon.get_width() / icon.get_height(), icon_height)
	var left = maxf(0, size.x - width - extent.x - 8)
	if alignment == HORIZONTAL_ALIGNMENT_CENTER: left *= 0.5
	elif alignment == HORIZONTAL_ALIGNMENT_LEFT: left = 0
	var baseline = size.y / 2 - bounds.get_center().y
	number_rect = Rect2(Vector2(left, baseline + bounds.position.y), Vector2(width, height))
	icon_rect = Rect2(Vector2(left + width + 8, number_rect.get_center().y - icon_height / 2), extent)
	if text_shadow.a > 0:
		preload("res://ui/button_text_shadow.gd").draw_oval(get_canvas_item(), number_rect, fitted, text_shadow)
		preload("res://ui/button_text_shadow.gd").draw_string(get_canvas_item(), font, Vector2(left, baseline + 1.5), text, fitted, text_shadow)
	draw_string(font, Vector2(left, baseline), text, HORIZONTAL_ALIGNMENT_LEFT, -1, fitted, tint)
	draw_texture_rect(icon, icon_rect, false)
