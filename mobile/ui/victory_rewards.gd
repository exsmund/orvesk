extends Control
## Victory body only: the shared page header and inspection dialogs stay unchanged.
signal inspected(index: int)
signal continued
signal declined
signal upgrade_requested
const GothicTheme = preload("res://ui/gothic_theme.gd")
const FittedLabel = preload("res://ui/fitted_label.gd")
const ShardCounter = preload("res://ui/shard_counter.gd")
var received = FittedLabel.new()
var shards = ShardCounter.new()
var recovered = ShardCounter.new()
var divider = preload("res://ui/header_divider.gd").new()
var rails: Array[Control] = []
var heading = FittedLabel.new()
var choice_hint = FittedLabel.new()
var rewards = preload("res://ui/reward_grid.gd").new()
var empty_hint = FittedLabel.new()
var continue_button = Button.new()
var skip_button = Button.new()
var upgrade_button = Button.new()
var progression = false
var configured = false

func _init():
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	resized.connect(arrange)
	for node in [received, shards, recovered, divider, heading, choice_hint, rewards, empty_hint, continue_button, skip_button, upgrade_button]:
		add_child(node)
	for _i in 2:
		var rail = preload("res://ui/textured_divider.gd").new()
		add_child(rail)
		rails.append(rail)
	rewards.inspected.connect(func(index): inspected.emit(index))
	continue_button.pressed.connect(func(): continued.emit())
	skip_button.pressed.connect(func(): declined.emit())
	upgrade_button.pressed.connect(func(): upgrade_requested.emit())

func configure(data, receipt: Dictionary, entries: Array):
	progression = receipt.get("progressionPending", false)
	for node in [received, heading, choice_hint, empty_hint]:
		node.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		node.add_theme_color_override("font_color", data.color("text-muted") if node != heading else data.color("text-home"))
	received.text = "Получено"
	received.base_font_size = 14
	shards.prefix = "+"
	shards.font_size = 32
	shards.group_digits = true
	shards.alignment = HORIZONTAL_ALIGNMENT_CENTER
	shards.configure(data, int(receipt.get("shards", 0)))
	recovered.prefix = "Возвращено: +"
	recovered.font_size = 16
	recovered.group_digits = true
	recovered.alignment = HORIZONTAL_ALIGNMENT_CENTER
	recovered.configure(data, int(receipt.get("recoveredShards", 0)))
	recovered.visible = recovered.amount > 0
	for rail in rails: rail.configure(data)
	heading.text = "Выберите награду"
	heading.add_theme_font_override("font", GothicTheme.DISPLAY_FONT)
	heading.base_font_size = 24
	heading.visible = progression or not entries.is_empty()
	choice_hint.text = "Можно выбрать только одну награду"
	choice_hint.base_font_size = 14
	choice_hint.visible = entries.size() > 1
	rewards.configure(data, entries)
	empty_hint.text = "" if receipt.has("title") else "Новых предметов и навыков нет."
	empty_hint.base_font_size = 16
	empty_hint.visible = entries.is_empty()
	continue_button.text = "Продолжить"
	continue_button.visible = entries.is_empty()
	skip_button.text = "Отказаться от награды"
	skip_button.visible = not entries.is_empty()
	upgrade_button.text = "Поднять уровень"
	upgrade_button.visible = progression
	configured = true
	arrange()

func refresh_progression(can_upgrade: bool):
	if not progression: return
	heading.text = "Можно поднять уровень" if can_upgrade else "Продолжите путешествие"
	empty_hint.visible = false
	upgrade_button.disabled = not can_upgrade
	arrange()

func put(node: Control, rect: Rect2):
	node.position = rect.position
	node.size = rect.size
	if node is FittedLabel: node.fit()

func arrange():
	if not configured or size.x <= 0: return
	# Compact the gaps on a short landscape display; folding never rebuilds offers.
	var spacing = clampf(size.y / 400, 0.65, 1.0)
	var y = 4.0 * spacing
	put(received, Rect2(0, y, size.x, 22))
	y += 24 * spacing
	var amount_text = "+%d" % shards.amount
	var amount_width = minf(size.x * 0.72, maxf(92, GothicTheme.DISPLAY_FONT.get_string_size(amount_text, HORIZONTAL_ALIGNMENT_LEFT, -1, shards.font_size).x + 56))
	put(shards, Rect2((size.x - amount_width) / 2, y, amount_width, 46 * spacing))
	var rail_width = maxf(0, (size.x - amount_width) / 2 - 24)
	for i in 2:
		put(rails[i], Rect2(12 if i == 0 else (size.x + amount_width) / 2 + 12, y + 23 * spacing, rail_width, 2))
	y += 46 * spacing
	if recovered.visible:
		put(recovered, Rect2(0, y, size.x, 28))
		y += 28
	put(divider, Rect2(size.x * 0.08, y, size.x * 0.84, 10))
	y += 12 * spacing
	put(heading, Rect2(0, y, size.x, 38))
	y += 38
	if choice_hint.visible:
		put(choice_hint, Rect2(0, y, size.x, 24))
		y += 24
	y += 8 * spacing
	var action_width = minf(420, size.x * 0.9)
	var action_x = (size.x - action_width) / 2
	var action_y = size.y - 56
	if progression:
		put(upgrade_button, Rect2(action_x, action_y - 64, action_width, 52))
	put(continue_button, Rect2(action_x, action_y, action_width, 52))
	put(skip_button, Rect2(action_x, action_y, action_width, 52))
	put(rewards, Rect2(0, y, size.x, maxf(0, action_y - 16 - y)))
	rewards.arrange()
	if empty_hint.visible:
		put(empty_hint, Rect2(0, y - 38, size.x, 28))
