extends Control
## Dialogue controls stay above an inert bottom band shared with no game action.
const Header = preload("res://ui/game_header.gd")
const GothicTheme = preload("res://ui/gothic_theme.gd")
var host
var header = Header.new()
var panel_shadow = preload("res://ui/panel_shadow.gd").new()
var surface = preload("res://ui/character_surface.gd").new()
var portrait = preload("res://ui/portrait_art.gd").new()
var words = Control.new()
var fade_group = CanvasGroup.new()
var name_divider = preload("res://ui/header_divider.gd").new()
var speaker_name = preload("res://ui/fitted_label.gd").new()
var text_scroll = ScrollContainer.new()
var speech = VBoxContainer.new()
var top_padding = Control.new()
var current_paragraph: Control
var controls = VBoxContainer.new()
var notice = Label.new()
var scroll_hint = Control.new()
var side = "right"
var has_portrait = false
var is_choice = false
var safe_bottom = 80.0

func configure(controller):
	host = controller
	mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(header)
	var current = host.session.campaign.node()
	header.title_override = host.data.story.scenes[current.scene].title
	header.configure_journey(host.data, host.session.game)
	header.player_requested.connect(host.show_character)
	add_child(panel_shadow)
	panel_shadow.configure(host.data)
	add_child(surface)
	surface.configure(host.data, 14, 0.48)
	for child in [portrait, speaker_name, name_divider, words, notice, scroll_hint]: add_child(child)
	scroll_hint.mouse_filter = Control.MOUSE_FILTER_IGNORE
	scroll_hint.visible = false
	scroll_hint.draw.connect(func():
		scroll_hint.draw_polyline(PackedVector2Array([Vector2(2, 2), Vector2(16, 12), Vector2(30, 2)]), host.data.color("text-home"), 2.0, true)
	)
	var scroll_bar = text_scroll.get_v_scroll_bar()
	scroll_bar.value_changed.connect(func(_value): update_scroll_hint())
	scroll_bar.changed.connect(update_scroll_hint)
	portrait.configure(host.data, null)
	speaker_name.add_theme_font_override("font", GothicTheme.DISPLAY_FONT)
	speaker_name.base_font_size = 24
	speaker_name.add_theme_color_override("font_color", host.data.color("text-home"))
	speaker_name.add_theme_color_override("font_shadow_color", host.data.color("shadow-character-card-2"))
	speaker_name.add_theme_constant_override("shadow_offset_x", 0)
	speaker_name.add_theme_constant_override("shadow_offset_y", 2)
	speaker_name.add_theme_constant_override("shadow_outline_size", 4)
	words.add_child(fade_group)
	fade_group.add_child(text_scroll)
	fade_group.material = ShaderMaterial.new()
	fade_group.material.shader = preload("res://shaders/dialogue_scroll.gdshader")
	text_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	text_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	text_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER
	text_scroll.add_child(speech)
	speech.resized.connect(func(): scroll_to_latest.call_deferred())
	speech.size_flags_vertical = Control.SIZE_EXPAND_FILL
	speech.alignment = BoxContainer.ALIGNMENT_END
	speech.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	speech.add_theme_constant_override("separation", 14)
	controls.add_theme_constant_override("separation", 6)
	notice.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	notice.add_theme_color_override("font_color", host.data.color("text-danger"))
	is_choice = current.kind == "choice"
	if current.get("speaker", "") and not is_choice:
		var person = host.data.speaker(current.speaker, host.session.game.player)
		portrait.texture = person.texture
		side = person.side
		speaker_name.text = current.get("speakerName", person.name)
		has_portrait = portrait.texture != null
	portrait.visible = has_portrait
	speaker_name.visible = not speaker_name.text.is_empty()
	name_divider.visible = speaker_name.visible
	top_padding.mouse_filter = Control.MOUSE_FILTER_IGNORE
	speech.add_child(top_padding)
	for entry in host.session.game.story.get("dialogue", {}).get("entries", []):
		var paragraph = VBoxContainer.new()
		paragraph.add_theme_constant_override("separation", 2)
		speech.add_child(paragraph)
		var latest = entry.id == current.id
		if latest: current_paragraph = paragraph
		var label = Label.new()
		label.text = entry.text
		if not entry.name.is_empty() and not latest:
			var author = Label.new()
			author.text = entry.name
			author.add_theme_font_override("font", GothicTheme.DISPLAY_FONT)
			author.add_theme_font_size_override("font_size", 15)
			author.add_theme_color_override("font_color", host.data.color("text-muted"))
			paragraph.add_child(author)
		label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		label.add_theme_font_override("font", GothicTheme.DISPLAY_FONT)
		label.add_theme_font_size_override("font_size", 19)
		label.add_theme_color_override("font_color", host.data.color("text-home" if latest or is_choice else "text-muted"))
		paragraph.add_child(label)
	speech.add_child(controls)
	if is_choice:
		var number = 0
		for id in host.session.campaign.options():
			number += 1
			var option = host.data.story.nodes[id]
			add_action("%d.  %s" % [number, option.text], func(): host.act(func(): return host.session.story_advance(current.id, id)), true)
	elif current.kind == "end":
		add_action("Пройти ещё раз →", host.offer_replay)
		add_action("Главное меню →", host.show_home)
	else:
		add_action(current.get("label", host.data.story.rules.ui.continueLabel) + " →", func(): host.act(func(): return host.session.story_advance(current.id)))
	var tail = Control.new()
	tail.custom_minimum_size.y = 54 if is_choice else 12
	tail.mouse_filter = Control.MOUSE_FILTER_IGNORE
	speech.add_child(tail)
	resized.connect(arrange)
	controls.minimum_size_changed.connect(func(): arrange.call_deferred())
	arrange()
	call_deferred("scroll_to_latest")

func add_action(caption: String, callback: Callable, answer: bool = false):
	var button = Button.new()
	button.text = caption.replace(" →", "\u00a0→")
	button.flat = true
	button.alignment = HORIZONTAL_ALIGNMENT_LEFT if answer else HORIZONTAL_ALIGNMENT_RIGHT
	button.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART if answer else TextServer.AUTOWRAP_OFF
	button.size_flags_horizontal = Control.SIZE_FILL if answer else Control.SIZE_SHRINK_END
	button.custom_minimum_size.y = 40
	button.add_theme_font_override("font", GothicTheme.DISPLAY_FONT)
	button.add_theme_font_size_override("font_size", 19)
	for state in ["normal", "hover", "pressed", "disabled"]: button.add_theme_stylebox_override(state, StyleBoxEmpty.new())
	button.pressed.connect(callback)
	controls.add_child(button)

func scroll_to_latest():
	var bar = text_scroll.get_v_scroll_bar()
	var target = maxf(0, bar.max_value - bar.page)
	if is_instance_valid(current_paragraph):
		# Keep the beginning of the new speech below the fixed top fade.
		# Short speeches still settle at the bottom; long ones require reading down.
		target = minf(target, maxf(0, current_paragraph.position.y - top_padding.custom_minimum_size.y - 4))
	text_scroll.scroll_vertical = int(target)

func update_scroll_hint():
	var bar = text_scroll.get_v_scroll_bar()
	scroll_hint.visible = bar.max_value - bar.page - bar.value > 1.0

func set_notice(message: String):
	notice.text = message

func arrange():
	if not host or not is_inside_tree() or size.x <= 0: return
	header.size = Vector2(size.x, Header.HEIGHT)
	safe_bottom = clampf(size.y * 0.10, 70, 100)
	var width = minf(size.x, 780)
	var x = (size.x - width) / 2
	var bottom = size.y - safe_bottom
	var available = maxf(130, bottom - Header.HEIGHT - 12)
	var height = minf(available, maxf(260, size.y * 0.48))
	var top = bottom - height
	surface.position = Vector2(x, top)
	surface.size = Vector2(width, height)
	panel_shadow.fit_panel(surface.get_rect())
	var overlap = minf(130, maxf(0, top - Header.HEIGHT - 8))
	var base_image_side = minf(width * 0.51, overlap + 85)
	var image_side = base_image_side * 1.30
	var outward = image_side * 0.10
	portrait.size = Vector2.ONE * image_side
	# Inset both the portrait and its clipping plane to the frame interior.
	var border = surface.frame.corner * 0.33 # Visible side strip occupies one third of the nine-slice corner.
	portrait.position = Vector2(x - outward + border if side == "left" else x + width - image_side + outward - border, top - overlap - (image_side - base_image_side) + image_side * 0.10)
	portrait.material.set_shader_parameter("horizontal_clip", Vector2((x + border - portrait.position.x) / image_side, (x + width - border - portrait.position.x) / image_side))
	var occupied_width = image_side - outward + border
	# Let the heading overlap the shoulder while keeping the outer text inset.
	var name_width = minf(width - 44, maxf(width - occupied_width - 44, (width - 44) * 0.56))
	speaker_name.position = Vector2(x + width - 22 - name_width if side == "left" else x + 22, top + 12)
	speaker_name.size = Vector2(name_width, 40)
	speaker_name.fit()
	name_divider.position = speaker_name.position + Vector2(0, 42)
	name_divider.size = Vector2(speaker_name.size.x, 12)
	# Begin fading beside the portrait, directly below the speaker heading.
	# The previous 88 px inset left a hard empty strip below the portrait fade.
	var content_top = top + 54
	var text_fade_height = minf(base_image_side * 0.22, (bottom - content_top - 18) * 0.25)
	# Scrollable padding lets the first line clear the fixed fade at scroll zero.
	top_padding.custom_minimum_size.y = text_fade_height
	words.position = Vector2(x + 22, content_top)
	words.size = Vector2(width - 44, maxf(50, bottom - content_top - 18))
	text_scroll.position = Vector2.ZERO
	text_scroll.size = words.size
	speech.custom_minimum_size.y = words.size.y - 2
	for button in controls.get_children():
		if not is_choice: GothicTheme.fit_button_text(button, words.size.x, 19)
	var viewport_height = get_viewport_rect().size.y
	var global_top = words.get_global_transform_with_canvas().origin.y
	var global_height = words.size.y * words.get_global_transform_with_canvas().get_scale().y
	fade_group.material.set_shader_parameter("edges", Vector2(global_top / viewport_height, (global_top + global_height) / viewport_height))
	fade_group.material.set_shader_parameter("fade_size", text_fade_height * words.get_global_transform_with_canvas().get_scale().y / viewport_height)
	scroll_hint.position = Vector2(x + width / 2 - 16, bottom - 28)
	scroll_hint.size = Vector2(32, 14)
	update_scroll_hint.call_deferred()
	notice.position = Vector2(x + 22, bottom + 4)
	notice.size = Vector2(width - 44, 24)
