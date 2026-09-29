extends PanelContainer
## Reuse the combat figure; keep its formula readable in compact comparisons.
const Card = preload("res://ui/card_button.gd")
const GothicTheme = preload("res://ui/gothic_theme.gd")
var preview = Card.new()
var layout = VBoxContainer.new()
var row = HBoxContainer.new()
var words = VBoxContainer.new()
var formula = preload("res://ui/formula_label.gd").new()
var name_label = Label.new()
var copies = Label.new()
var model
var surface: StyleBoxFlat
var compact = false

func configure(renderer, presenter, entry: Dictionary, card: Dictionary):
	# Read-only figure panels must let touch drags reach the enclosing scroll.
	for node in [self, layout, row, words]: node.mouse_filter = Control.MOUSE_FILTER_IGNORE
	model = presenter
	surface = GothicTheme.panel(renderer.data,10)
	surface.bg_color.a = 0.52
	add_theme_stylebox_override("panel",surface)
	add_child(layout)
	layout.add_theme_constant_override("separation", 5)
	layout.add_child(name_label)
	layout.add_child(row)
	row.add_theme_constant_override("separation", 10)
	row.add_child(preview)
	preview.configure(renderer, card, entry.fighter, {})
	preview.interactive = false
	preview.mouse_filter = Control.MOUSE_FILTER_IGNORE
	preview.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	preview.caption.hide()
	row.add_child(words)
	words.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	words.add_theme_constant_override("separation", 5)
	name_label.text = card.name
	name_label.add_theme_font_size_override("font_size", 14)
	name_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	words.add_child(formula)
	formula.configure(renderer.data, model.formula_runs(entry.fighter, card))
	copies.text = "В колоде: %d" % entry.copies.get(card.id, card.get("copies", 1))
	copies.add_theme_font_size_override("font_size", 13)
	copies.add_theme_color_override("font_color", renderer.data.color("text-muted"))
	copies.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	words.add_child(copies)
	for label in [name_label, copies]: label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	resized.connect(arrange)
	arrange()

func set_compact(value: bool):
	if compact == value: return
	compact = value
	surface.set_content_margin_all(6 if compact else 10)
	row.add_theme_constant_override("separation", 6 if compact else 10)
	name_label.add_theme_font_size_override("font_size", 13 if compact else 14)
	formula.add_theme_font_size_override("normal_font_size", 12 if compact else 13)
	copies.add_theme_font_size_override("font_size", 12 if compact else 13)
	arrange()

func arrange():
	if not preview.art: return
	var pitch = 30.0 if compact else clampf((size.x - 20) * 0.12, 34, 44)
	var extent = preview.art.bounds(preview.art.points(preview.card, 0))
	preview.cell_pitch = pitch
	preview.custom_minimum_size = Vector2(maxf(50, extent.x * pitch + 6), extent.y * pitch + 24)
	preview.queue_redraw()
