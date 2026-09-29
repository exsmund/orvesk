extends Button
## One atomic purchase of all missing attributes, directly under item requirements.
signal requested(quote: Dictionary)
var quote: Dictionary = {}
var cost = preload("res://ui/shard_counter.gd").new()

func _init():
	custom_minimum_size.y = 48
	add_child(cost)
	cost.prefix = "Поднять за "
	cost.font_size = 16
	cost.alignment = HORIZONTAL_ALIGNMENT_CENTER
	cost.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	cost.offset_left = 12
	cost.offset_right = -12
	pressed.connect(func():
		if visible and not disabled: requested.emit(quote.duplicate(true)))

func configure(data, offer_quote: Dictionary):
	quote = offer_quote.duplicate(true)
	visible = not quote.get("steps", []).is_empty() and quote.get("error", "").is_empty() and int(quote.get("balance", 0)) >= int(quote.get("totalCost", 0))
	cost.configure(data, int(quote.get("totalCost", 0)))
	tooltip_text = "Повысить недостающие характеристики за %d осколков" % cost.amount

func set_compact(value: bool):
	cost.font_size = 14 if value else 16
	cost.queue_redraw()
