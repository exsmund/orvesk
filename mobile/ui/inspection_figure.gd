extends PanelContainer
## The combat card draws the figure and its cost; only the explanation is specific to inspection.
const Card = preload("res://ui/card_button.gd")
const GothicTheme = preload("res://ui/gothic_theme.gd")
var preview = Card.new()
var row = HBoxContainer.new()
var words = VBoxContainer.new()
var formula = Label.new()
var name_label = Label.new()
var model

func configure(renderer, presenter, entry: Dictionary, card: Dictionary):
	model = presenter
	var surface = GothicTheme.panel(renderer.data,10)
	surface.bg_color.a = 0.52
	add_theme_stylebox_override("panel",surface)
	add_child(row)
	row.add_theme_constant_override("separation", 12)
	row.add_child(preview)
	preview.configure(renderer, card, entry.fighter, {})
	preview.interactive = false
	preview.mouse_filter = Control.MOUSE_FILTER_IGNORE
	preview.caption.hide()
	row.add_child(words)
	words.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	words.add_theme_constant_override("separation", 5)
	name_label.text = card.name
	name_label.add_theme_font_size_override("font_size", 16)
	name_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	words.add_child(name_label)
	formula.text = "\n".join(model.formula_lines(entry.fighter, card))
	formula.add_theme_font_size_override("font_size", 13)
	formula.add_theme_color_override("font_color", renderer.data.color("text-muted"))
	formula.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	formula.visible = not formula.text.is_empty()
	words.add_child(formula)
	var copies = Label.new()
	copies.text = "В колоде: %d" % entry.copies.get(card.id, card.get("copies", 1))
	copies.add_theme_font_size_override("font_size", 13)
	copies.add_theme_color_override("font_color", renderer.data.color("text-muted"))
	words.add_child(copies)
	for label in [name_label, formula, copies]: label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	resized.connect(arrange)
	arrange()

func arrange():
	if not preview.art: return
	var pitch = clampf((size.x - 20) * 0.12, 24, 38)
	var extent = preview.art.bounds(preview.art.points(preview.card, 0))
	preview.cell_pitch = pitch
	preview.custom_minimum_size = Vector2(maxf(60, extent.x * pitch + 10), extent.y * pitch + 24)
	preview.queue_redraw()
