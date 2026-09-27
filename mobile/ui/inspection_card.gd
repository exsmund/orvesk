extends VBoxContainer
const Figure = preload("res://ui/inspection_figure.gd")
const GothicTheme = preload("res://ui/gothic_theme.gd")
var entry: Dictionary
var figure_rows: Array = []
var title_label: Label
var artwork = preload("res://ui/inspection_art.gd").new()
var data

func text(value: String, font_size: int = 16, serif: bool = false, muted: bool = false) -> Label:
	var label = Label.new()
	label.text = value
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", data.color("text-muted" if muted else "text-home"))
	if serif: label.add_theme_font_override("font", GothicTheme.DISPLAY_FONT)
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(label)
	return label

func separator():
	var line = preload("res://ui/textured_divider.gd").new()
	add_child(line)
	line.configure(data)
	line.custom_minimum_size.y = line.THICKNESS

func status_badge():
	if entry.status.is_empty(): return
	var offered = entry.status == "Предлагается"
	var tint = data.color("border-journey-map-2-2" if offered else "border-action-figures")
	var style = StyleBoxFlat.new()
	style.bg_color = Color(data.color("background-action-figures-2" if offered else "background-action-figures"),0.5)
	style.border_color = tint
	style.set_border_width_all(1)
	style.content_margin_left = 12
	style.content_margin_right = 12
	style.content_margin_top = 4
	style.content_margin_bottom = 4
	var badge = PanelContainer.new()
	badge.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	badge.mouse_filter = Control.MOUSE_FILTER_IGNORE
	badge.add_theme_stylebox_override("panel",style)
	add_child(badge)
	var caption = Label.new()
	caption.text = entry.status
	caption.add_theme_font_size_override("font_size",14)
	caption.add_theme_color_override("font_color",tint)
	caption.mouse_filter = Control.MOUSE_FILTER_IGNORE
	badge.add_child(caption)

func configure(catalog, renderer, presenter, definition: Dictionary):
	data = catalog
	entry = definition
	size_flags_horizontal = Control.SIZE_EXPAND_FILL
	add_theme_constant_override("separation", 12)
	status_badge()
	add_child(artwork)
	artwork.configure(data,entry.texture)
	title_label = text(entry.title, 26, true)
	text(entry.description, 14, false, true)
	text(entry.metadata, 15, false, true)
	separator()
	if not entry.requirements.is_empty():
		text("Требования", 15, false, true)
		for stat in entry.requirements:
			var requirement = HBoxContainer.new()
			add_child(requirement)
			var caption = Label.new()
			caption.text = data.STAT_NAMES[stat]
			caption.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			requirement.add_child(caption)
			var value = Label.new()
			var needed = entry.requirements[stat]
			var current = entry.fighter.stats[stat]
			value.text = str(int(needed)) + (" (у вас %d)" % current if current < needed else "")
			value.add_theme_color_override("font_color", data.color("text-danger" if current < needed else "text-home"))
			requirement.add_child(value)
	if not entry.defense.is_empty():
		text("Защита", 18, true)
		for type in entry.defense:
			text("%s: %s" % [presenter.damage_types.get(type, {}).get("name", type), presenter.number(entry.defense[type])])
	if not entry.figures.is_empty():
		separator()
		text("Фигуры-действия", 20, true)
		for card in entry.figures:
			var figure = Figure.new()
			add_child(figure)
			figure.configure(renderer, presenter, entry, card)
			figure_rows.append(figure)
