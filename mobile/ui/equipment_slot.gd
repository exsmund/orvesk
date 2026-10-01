extends BaseButton
## One square inspection target for worn equipment and learned skills.
const GothicTheme = preload("res://ui/gothic_theme.gd")
const Frame = preload("res://ui/texture_frame.gd")
var palette

func configure(data, texture: Texture2D):
	palette = data
	focus_mode = Control.FOCUS_ALL
	var background = Panel.new()
	var style = GothicTheme.panel(data, 0)
	style.bg_color = data.color("background-page")
	background.add_theme_stylebox_override("panel", style)
	background.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(background)
	background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var inset_shadow = ColorRect.new()
	inset_shadow.mouse_filter = Control.MOUSE_FILTER_IGNORE
	inset_shadow.material = ShaderMaterial.new()
	inset_shadow.material.shader = preload("res://shaders/slot_shadow.gdshader")
	inset_shadow.material.set_shader_parameter("shadow_color", data.color("shadow-character-card-2"))
	add_child(inset_shadow)
	inset_shadow.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	inset_shadow.resized.connect(func(): inset_shadow.material.set_shader_parameter("panel_size", inset_shadow.size))
	var art = TextureRect.new()
	art.texture = texture
	art.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	art.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	art.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(art)
	art.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	art.offset_left = 5
	art.offset_top = 5
	art.offset_right = -5
	art.offset_bottom = -5
	var frame = Frame.new()
	add_child(frame)
	frame.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	frame.configure(data, 8)
	var highlight = Control.new()
	highlight.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(highlight)
	highlight.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	highlight.draw.connect(func():
		if has_focus() or is_hovered(): highlight.draw_rect(Rect2(Vector2(2,2),size-Vector2(4,4)),data.color("text-highlight"),false,1))
	for event in [focus_entered,focus_exited,mouse_entered,mouse_exited,resized]: event.connect(highlight.queue_redraw)
