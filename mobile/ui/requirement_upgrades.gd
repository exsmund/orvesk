extends VBoxContainer
## The existing one-point reward upgrade flow, shared by all inspection layouts.
signal requested(stat: String, expected_value: int)
var steps: VBoxContainer

func configure(data, quote: Dictionary):
	for child in get_children():
		remove_child(child)
		child.queue_free()
	steps = VBoxContainer.new()
	steps.add_theme_constant_override("separation", 8)
	visible = not quote.get("steps", []).is_empty()
	if not visible:
		add_child(steps)
		return
	add_theme_constant_override("separation", 8)
	var summary = HBoxContainer.new()
	add_child(summary)
	for part in [["Есть: ",quote.balance],["Нужно: ",quote.totalCost]]:
		var counter = preload("res://ui/shard_counter.gd").new()
		counter.prefix = part[0]
		counter.font_size = 17
		counter.alignment = HORIZONTAL_ALIGNMENT_LEFT
		counter.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		counter.custom_minimum_size.y = 32
		summary.add_child(counter)
		counter.configure(data, part[1])
	add_child(steps)
	for step in quote.steps:
		var row = HBoxContainer.new()
		row.add_theme_constant_override("separation", 8)
		steps.add_child(row)
		var label = Label.new()
		label.text = "%s: %d → %d" % [data.STAT_NAMES[step.stat], step.current, step.required]
		label.add_theme_font_size_override("font_size", 15)
		label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(label)
		var button = Button.new()
		button.custom_minimum_size = Vector2(112, 48)
		button.disabled = quote.balance < step.cost
		button.tooltip_text = "Повысить %s на 1 за %d осколков" % [data.STAT_NAMES[step.stat], step.cost]
		button.pressed.connect(func(): requested.emit(step.stat, step.current))
		row.add_child(button)
		var cost = preload("res://ui/shard_counter.gd").new()
		cost.prefix = "+1 · "
		cost.font_size = 16
		cost.alignment = HORIZONTAL_ALIGNMENT_CENTER
		button.add_child(cost)
		cost.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		cost.offset_left = 12
		cost.offset_right = -12
		cost.configure(data, step.cost)
		if button.disabled: cost.modulate.a = 0.5
	var note = Label.new()
	note.text = "Прокачка сохраняется сразу."
	note.add_theme_font_size_override("font_size", 13)
	note.add_theme_color_override("font_color", data.color("text-muted"))
	add_child(note)
