extends Control
## One speaker per window, persistent choices, shared header/theme and safe width.
const Header = preload("res://ui/game_header.gd")
const GothicTheme = preload("res://ui/gothic_theme.gd")
var host
var header = Header.new()
var surface = preload("res://ui/character_surface.gd").new()
var portrait = TextureRect.new()
var portrait_frame = preload("res://ui/texture_frame.gd").new()
var words = VBoxContainer.new()
var speaker_name = Label.new()
var text_scroll = ScrollContainer.new()
var speech = Label.new()
var controls = VBoxContainer.new()
var notice = Label.new()
var side = "right"
var has_portrait = false

func configure(controller):
	host = controller
	add_child(header)
	header.title_override = host.data.story.scenes[host.session.campaign.node().scene].title
	header.configure_journey(host.data, host.session.game, host.animated)
	header.player_requested.connect(host.show_character)
	header.menu_requested.connect(host.show_journey_menu)
	add_child(surface)
	surface.configure(host.data, 20, 0.72)
	for child in [portrait, portrait_frame, words, controls, notice]: add_child(child)
	portrait.mouse_filter = Control.MOUSE_FILTER_IGNORE
	portrait.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	portrait.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	portrait_frame.configure(host.data, 13, "/ui/portrait-frame-v1.png")
	words.add_theme_constant_override("separation", 12)
	words.add_child(speaker_name)
	speaker_name.add_theme_font_override("font", GothicTheme.DISPLAY_FONT)
	speaker_name.add_theme_font_size_override("font_size", 25)
	speaker_name.add_theme_color_override("font_color", host.data.color("text-home"))
	speaker_name.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	words.add_child(text_scroll)
	text_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	text_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	text_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER
	text_scroll.add_child(speech)
	speech.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	speech.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	speech.add_theme_font_size_override("font_size", 19)
	speech.add_theme_color_override("font_color", host.data.color("text-home"))
	controls.add_theme_constant_override("separation", 8)
	notice.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	notice.add_theme_font_size_override("font_size", 14)
	notice.add_theme_color_override("font_color", host.data.color("text-danger"))
	var current = host.session.campaign.node()
	speech.text = host.session.campaign.display_text()
	if current.get("speaker", ""):
		var person = host.data.speaker(current.speaker, host.session.game.player)
		portrait.texture = person.texture
		side = person.side
		speaker_name.text = current.get("speakerName", person.name)
		has_portrait = portrait.texture != null
	portrait.visible = has_portrait
	portrait_frame.visible = has_portrait
	speaker_name.visible = not speaker_name.text.is_empty()
	if current.kind == "choice":
		for id in host.session.campaign.options():
			var option = host.data.story.nodes[id]
			var button = host.button(option.text, func(): host.act(func(): return host.session.story_advance(current.id, id)), controls)
			button.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			button.custom_minimum_size.y = 54
	elif current.kind == "end":
		host.button("Главное меню", host.show_home, controls)
	else:
		host.button(current.get("label", host.data.story.rules.ui.continueLabel), func(): host.act(func(): return host.session.story_advance(current.id)), controls)
	resized.connect(arrange)
	controls.minimum_size_changed.connect(func(): arrange.call_deferred())
	arrange()

func set_notice(message: String):
	notice.text = message

func arrange():
	if not host or not is_inside_tree() or size.x <= 0: return
	header.size = Vector2(size.x, Header.HEIGHT)
	var gap = 16.0
	var top = Header.HEIGHT + gap
	var controls_height = maxf(54, controls.get_combined_minimum_size().y)
	controls.position = Vector2(0, size.y - controls_height)
	controls.size = Vector2(size.x, controls_height)
	notice.position = Vector2(8, controls.position.y-28)
	notice.size = Vector2(size.x-16,24)
	var height = maxf(100, controls.position.y-top-32)
	surface.position = Vector2(0,top)
	surface.size = Vector2(size.x,height)
	var inside = Rect2(Vector2(24,top+24), Vector2(size.x-48,height-48))
	var wide = size.x > 660
	var image_size = Vector2.ZERO
	if has_portrait:
		var image_height = minf(inside.size.y, 350) if wide else minf(inside.size.y * 0.47, 210)
		image_size = Vector2(image_height * 2/3, image_height)
		portrait.size = image_size
		portrait.position = Vector2(inside.position.x if side == "left" else inside.end.x-image_size.x,inside.position.y)
		portrait_frame.position = portrait.position - Vector2.ONE*5
		portrait_frame.size = portrait.size + Vector2.ONE*10
	if wide and has_portrait:
		words.position = inside.position + Vector2(image_size.x+24 if side == "left" else 0,0)
		words.size = Vector2(inside.size.x-image_size.x-24,inside.size.y)
	else:
		words.position = inside.position + Vector2(0,image_size.y+16 if has_portrait else 0)
		words.size = Vector2(inside.size.x,maxf(60,inside.size.y-image_size.y-(16 if has_portrait else 0)))
