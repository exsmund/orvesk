extends VBoxContainer
signal upgrade_requested(quote: Dictionary)
const Figure = preload("res://ui/inspection_figure.gd")
const GothicTheme = preload("res://ui/gothic_theme.gd")
var entry: Dictionary
var figure_rows: Array = []
var title_label: Label
var upgrade_button = preload("res://ui/requirement_upgrades.gd").new()
var requirement_rows: Array = []
var artwork = preload("res://ui/inspection_art.gd").new()
var data
var compact = false
var responsive_text: Array = []

func text(value: String, font_size: int = 16, serif: bool = false, muted: bool = false) -> Label:
	var label = Label.new()
	label.text = value
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", data.color("text-muted" if muted else "text-home"))
	if serif: label.add_theme_font_override("font", GothicTheme.DISPLAY_FONT)
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(label)
	responsive_text.append([label, font_size])
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

func configure(catalog, renderer, presenter, definition: Dictionary, upgrade_quote: Dictionary = {}):
	data = catalog
	entry = definition
	size_flags_horizontal = Control.SIZE_EXPAND_FILL
	add_theme_constant_override("separation", 12)
	status_badge()
	add_child(artwork)
	artwork.configure(data,entry.texture)
	title_label = text(entry.title, 24, true)
	text(entry.description, 14, false, true)
	text(entry.metadata, 15, false, true)
	separator()
	if entry.has("stats"):
		text("Базовый профиль без экипировки", 15, false, true)
		text("Здоровье: %s · Выносливость: %s" % [presenter.number(data.max_hp(entry.fighter)), presenter.number(data.max_stamina(entry.fighter))], 15)
		for stat in data.STATS:
			text("%s: %d" % [data.STAT_NAMES[stat], entry.stats[stat]], 15)
	if not entry.requirements.is_empty():
		text("Требования", 15, false, true)
		for stat in entry.requirements:
			var requirement = HBoxContainer.new()
			add_child(requirement)
			requirement_rows.append(requirement)
			var caption = Label.new()
			caption.text = data.STAT_NAMES[stat]
			caption.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			caption.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			caption.add_theme_font_size_override("font_size", 15)
			responsive_text.append([caption, 15])
			requirement.add_child(caption)
			var value = Label.new()
			var needed = entry.requirements[stat]
			var current = data.effective_stat(entry.fighter, stat)
			value.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			value.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			value.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
			value.add_theme_font_size_override("font_size", 15)
			responsive_text.append([value, 15])
			value.text = str(int(needed)) + (" (у вас %d)" % current if current < needed else "")
			value.add_theme_color_override("font_color", data.color("text-danger" if current < needed else "text-home"))
			requirement.add_child(value)
	add_child(upgrade_button)
	upgrade_button.configure(data, upgrade_quote)
	upgrade_button.requested.connect(func(quote): upgrade_requested.emit(quote))
	if not entry.defense.is_empty():
		text("Защита", 18, true)
		for type in entry.defense:
			var row = HBoxContainer.new()
			add_child(row)
			var caption = Label.new()
			caption.text = "%s: %s" % [presenter.damage_types.get(type, {}).get("name", type), presenter.number(entry.defense[type])]
			caption.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			caption.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			caption.add_theme_font_size_override("font_size", 15)
			responsive_text.append([caption, 15])
			row.add_child(caption)
			var delta = float(entry.get("defenseDelta", {}).get(type, 0))
			if not is_zero_approx(delta):
				var difference = Label.new()
				difference.text = ("+" if delta > 0 else "−") + presenter.number(absf(delta))
				difference.add_theme_color_override("font_color", data.color("text-success" if delta > 0 else "text-danger"))
				difference.add_theme_font_size_override("font_size", 15)
				responsive_text.append([difference, 15])
				row.add_child(difference)
	if not entry.figures.is_empty():
		separator()
		text("Фигуры-действия", 20, true)
		for card in entry.figures:
			var figure = Figure.new()
			add_child(figure)
			figure.configure(renderer, presenter, entry, card)
			figure_rows.append(figure)

func set_compact(value: bool):
	if compact == value: return
	compact = value
	add_theme_constant_override("separation", 8 if compact else 12)
	artwork.custom_minimum_size.y = 112 if compact else 172
	for item in responsive_text:
		var preferred: int = item[1]
		var font_size = maxi(12, preferred - (6 if preferred >= 20 else 2)) if compact else preferred
		item[0].add_theme_font_size_override("font_size", font_size)
	upgrade_button.set_compact(compact)
	for figure in figure_rows: figure.set_compact(compact)
