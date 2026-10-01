extends StyleBox
## A shared textured button skin: proportional end ornaments and a tiled center.
var texture: Texture2D
var region_rect: Rect2 = Rect2()
var modulate_color = Color.WHITE
var shadow_color = Color.BLACK
const END_FRACTION = 0.09

func slices(rect: Rect2) -> Array:
	var source_cap = region_rect.size.x * END_FRACTION
	var cap = minf(rect.size.y * source_cap / region_rect.size.y, rect.size.x * 0.3)
	return [
		[Rect2(rect.position, Vector2(cap, rect.size.y)), Rect2(region_rect.position, Vector2(source_cap, region_rect.size.y))],
		[Rect2(rect.position + Vector2(cap, 0), Vector2(rect.size.x - 2 * cap, rect.size.y)), Rect2(region_rect.position + Vector2(source_cap, 0), Vector2(region_rect.size.x - 2 * source_cap, region_rect.size.y))],
		[Rect2(rect.end.x - cap, rect.position.y, cap, rect.size.y), Rect2(region_rect.end.x - source_cap, region_rect.position.y, source_cap, region_rect.size.y)]
	]

func _draw(canvas: RID, rect: Rect2):
	if not texture or rect.size.x <= 0 or rect.size.y <= 0: return
	var sections = slices(rect)
	for index in [0, 2]:
		texture.draw_rect_region(canvas, sections[index][0], sections[index][1], modulate_color)
	var destination: Rect2 = sections[1][0]
	var source: Rect2 = sections[1][1]
	var scale_factor = rect.size.y / source.size.y
	var tile_width = source.size.x * scale_factor
	var left = destination.position.x
	while left < destination.end.x - 0.01:
		var width = minf(tile_width, destination.end.x - left)
		texture.draw_rect_region(canvas, Rect2(left, rect.position.y, width, rect.size.y), Rect2(source.position, Vector2(width / scale_factor, source.size.y)), modulate_color)
		left += width
	var button = get_current_item_drawn()
	if button is Button and not button.text.is_empty(): draw_text_shadow(canvas, button, rect)

func draw_text_shadow(canvas: RID, button: Button, rect: Rect2):
	# This runs beneath Godot's native label, preserving its input and text behavior.
	# Framed actions use text; icon-and-text actions supply their own caption control.
	if button.icon: return
	var paragraph = TextParagraph.new()
	paragraph.break_flags = TextServer.BREAK_MANDATORY
	paragraph.alignment = button.alignment
	paragraph.add_string(button.tr(button.text), button.get_theme_font("font"), button.get_theme_font_size("font_size"))
	var available = rect.size - get_minimum_size()
	paragraph.width = ceilf(maxf(1, available.x))
	var position = rect.position + get_offset() + Vector2(0, (available.y - paragraph.get_size().y) * 0.5 + 1.5)
	var color = shadow_color
	if button.disabled: color.a *= 0.55
	var font_size = button.get_theme_font_size("font_size")
	var measured = paragraph.get_size()
	var center = rect.get_center()
	if button.alignment == HORIZONTAL_ALIGNMENT_LEFT: center.x = rect.position.x + get_offset().x + measured.x * 0.5
	elif button.alignment == HORIZONTAL_ALIGNMENT_RIGHT: center.x = rect.end.x - content_margin_right - measured.x * 0.5
	preload("res://ui/button_text_shadow.gd").draw_oval(canvas, Rect2(center - measured * 0.5, measured), font_size, color)
	preload("res://ui/button_text_shadow.gd").draw_paragraph(canvas, paragraph, position, button.get_theme_font_size("font_size"), color)
