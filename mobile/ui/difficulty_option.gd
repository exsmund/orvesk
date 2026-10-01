extends Button
## A full-row radio option with a material selection and an inline lock reason.
const GothicTheme = preload("res://ui/gothic_theme.gd")
const STONE = preload("res://ui/character_surface.gd").STONE
var data
var caption = Label.new()
var description = Label.new()
var chosen = Label.new()
var radio = ColorRect.new()
var unit = 1.0
var icon_rect = Rect2()
var gold = Color.WHITE
var muted = Color.WHITE

func configure(catalog, entry: Dictionary, available: bool):
	data = catalog
	gold = data.color("text-highlight")
	muted = data.color("text-muted")
	text = entry.name
	clip_text = true
	toggle_mode = true
	disabled = not available
	texture_repeat = CanvasItem.TEXTURE_REPEAT_ENABLED
	for state in ["normal", "hover", "pressed", "hover_pressed", "disabled", "focus"]:
		add_theme_stylebox_override(state, StyleBoxEmpty.new())
	for state in ["font_color", "font_hover_color", "font_pressed_color", "font_hover_pressed_color", "font_disabled_color", "font_focus_color"]:
		add_theme_color_override(state, Color.TRANSPARENT)
	for node in [caption, description, chosen, radio]:
		add_child(node)
		node.mouse_filter = Control.MOUSE_FILTER_IGNORE
	for label in [caption, description, chosen]:
		label.add_theme_font_override("font", GothicTheme.DISPLAY_FONT)
		label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	caption.text = entry.name
	caption.clip_text = true
	caption.add_theme_color_override("font_color", muted if disabled else data.color("text-home"))
	description.visible = disabled
	description.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	description.add_theme_color_override("font_color", muted)
	if disabled: description.text = "Откроется после прохождения\nна сложности «%s»." % data.difficulty(entry.requiresCompletion).name
	chosen.text = "Выбрано"
	chosen.add_theme_color_override("font_color", gold)
	chosen.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	radio.material = ShaderMaterial.new()
	radio.material.shader = preload("res://shaders/difficulty_radio.gdshader")
	radio.material.set_shader_parameter("gold", gold)
	radio.material.set_shader_parameter("dark", data.color("background-page"))
	radio.visible = not disabled
	resized.connect(arrange)
	toggled.connect(func(_pressed): refresh())
	for event in [mouse_entered, mouse_exited, focus_entered, focus_exited]: event.connect(queue_redraw)
	refresh()

func refresh():
	chosen.visible = button_pressed and not disabled
	radio.material.set_shader_parameter("selected", button_pressed)
	arrange()
	queue_redraw()

func arrange():
	if not data or size.x <= 0: return
	unit = clampf(size.x / 420.0, 0.68, 1.2)
	var inset = 22.0 * unit
	var diameter = 32.0 * unit
	icon_rect = Rect2(inset, (size.y - diameter) / 2, diameter, diameter)
	radio.position = icon_rect.position
	radio.size = icon_rect.size
	var left = icon_rect.end.x + 24 * unit
	var stacked = chosen.visible and size.x < 330
	var tag_width = 98.0 * unit if chosen.visible and not stacked else 0.0
	var text_width = maxf(1, size.x - left - inset - tag_width)
	var title_size = roundi(27 * unit)
	while title_size > 12 and GothicTheme.DISPLAY_FONT.get_string_size(caption.text, HORIZONTAL_ALIGNMENT_LEFT, -1, title_size).x > text_width: title_size -= 1
	caption.add_theme_font_size_override("font_size", title_size)
	chosen.add_theme_font_size_override("font_size", maxi(11, roundi(16 * unit)))
	description.add_theme_font_size_override("font_size", maxi(11, roundi(16 * unit)))
	description.size.x = text_width
	var title_height = title_size * 1.5
	var detail_height = description.get_minimum_size().y if disabled else (20 * unit if stacked else 0.0)
	var top = (size.y - title_height - detail_height) / 2
	caption.position = Vector2(left, top)
	caption.size = Vector2(text_width, title_height)
	description.position = Vector2(left, top + title_height)
	description.size.y = detail_height
	chosen.position = Vector2(left, top + title_height) if stacked else Vector2(size.x - inset - tag_width, (size.y - 28 * unit) / 2)
	chosen.size = Vector2(86 * unit, 20 * unit) if stacked else Vector2(tag_width, 28 * unit)
	queue_redraw()

func bevel(rect: Rect2, cut: float) -> PackedVector2Array:
	var a = rect.position
	var b = rect.end
	return PackedVector2Array([Vector2(a.x+cut,a.y),Vector2(b.x-cut,a.y),Vector2(b.x,a.y+cut),Vector2(b.x,b.y-cut),Vector2(b.x-cut,b.y),Vector2(a.x+cut,b.y),Vector2(a.x,b.y-cut),Vector2(a.x,a.y+cut)])

func ornament(center: Vector2, radius: float):
	var points = PackedVector2Array([center+Vector2(0,-radius),center+Vector2(radius*0.45,0),center+Vector2(0,radius),center-Vector2(radius*0.45,0),center+Vector2(0,-radius)])
	draw_polyline(points, gold, 1.0, true)

func _draw():
	if not data: return
	var selected = button_pressed and not disabled
	if selected or (is_hovered() and not disabled):
		var outline = bevel(Rect2(Vector2(1, 5), size - Vector2(2, 10)), 8 * unit)
		var uvs = PackedVector2Array()
		for point in outline: uvs.append(point * 1.35 / Vector2(STONE.get_size()))
		draw_polygon(outline, PackedColorArray([Color(gold * 0.55, 1.0)]), uvs, STONE)
		draw_colored_polygon(outline, Color(data.color("background-action-figures-2"), 0.20 if selected else 0.10))
		if selected:
			outline.append(outline[0])
			draw_polyline(outline, gold, 1.4, true)
			var inner = bevel(Rect2(Vector2(4, 8), size - Vector2(8, 16)), 7 * unit)
			inner.append(inner[0])
			draw_polyline(inner, Color(gold, 0.38), 0.8, true)
	if has_focus() and not selected and not disabled:
		var outline = bevel(Rect2(Vector2(2, 5), size - Vector2(4, 10)), 8 * unit)
		outline.append(outline[0])
		draw_polyline(outline, Color(gold, 0.6), 1.0, true)
	if chosen.visible and size.x >= 330:
		ornament(chosen.position + Vector2(3 * unit, chosen.size.y / 2), 4 * unit)
		ornament(chosen.position + Vector2(chosen.size.x - 3 * unit, chosen.size.y / 2), 4 * unit)
	if disabled: draw_lock()

func draw_lock():
	var c = icon_rect.get_center()
	var r = icon_rect.size.x
	var body = Rect2(c + Vector2(-0.30, -0.03) * r, Vector2(0.60, 0.54) * r)
	var top = c + Vector2(0, -0.06) * r
	for offset in [Vector2(0,1.5), Vector2.ZERO]:
		var color = data.color("base-black") if offset.y else muted
		draw_arc(top + offset, r*0.22, PI, TAU, 24, color, maxf(1.5, r*0.06), true)
		for direction in [-1,1]: draw_line(top+offset+Vector2(direction*r*0.22,0),top+offset+Vector2(direction*r*0.22,r*0.15),color,maxf(1.5,r*0.06),true)
	var style = StyleBoxFlat.new()
	style.bg_color = data.color("background-style-20")
	style.border_color = Color(muted, 0.65)
	style.set_border_width_all(1)
	style.set_corner_radius_all(2)
	draw_style_box(style, body)
	var hole = body.get_center() - Vector2(0, r * 0.045)
	draw_circle(hole, r*0.065, data.color("base-black"), true, -1, true)
	draw_line(hole, hole+Vector2(0,r*0.14),data.color("base-black"),r*0.07,true)
