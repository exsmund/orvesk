extends "res://ui/character_page.gd"
const Shards = preload("res://ui/shard_counter.gd")
const AttributeRow = preload("res://ui/attribute_row.gd")
var shards = Shards.new()
var price = Shards.new()
var rows: Dictionary = {}
var confirm = Button.new()
var warning: Label
var pending: Dictionary = {}
var baseline: Dictionary
var initial_shards: int
var divider = preload("res://ui/textured_divider.gd").new()
var locked = false
var locked_reason = ""
signal applied

func configure(owner_ui):
	setup(owner_ui)
	canvas.add_child(divider)
	divider.configure(host.data)
	baseline = host.session.game.player.stats.duplicate(true)
	initial_shards = int(host.session.game.souls)
	locked_reason = host.session.attribute_quote({}).error
	locked = not locked_reason.is_empty()
	canvas.add_child(shards)
	canvas.add_child(price)
	shards.alignment = HORIZONTAL_ALIGNMENT_CENTER
	shards.font_size = 32
	price.alignment = HORIZONTAL_ALIGNMENT_CENTER
	price.font_size = 20
	price.prefix = "Стоимость: "
	for stat in host.data.STATS:
		var entry = AttributeRow.new()
		canvas.add_child(entry)
		entry.configure(host.data, host.data.STAT_NAMES[stat], locked)
		entry.changed.connect(func(delta): change(stat, delta))
		rows[stat] = entry
	warning = preload("res://ui/action_hint.gd").new()
	canvas.add_child(warning)
	warning.configure(host.data)
	warning.size = Vector2(336, 62)
	canvas.add_child(confirm)
	confirm.text = "Подтвердить"
	confirm.pressed.connect(commit)
	refresh()

func change(stat: String, delta: int):
	if locked or stat not in host.data.STATS or delta not in [-1, 1]: return
	var proposed = pending.duplicate()
	proposed[stat] = maxi(0, proposed.get(stat, 0) + delta)
	if host.session.attribute_quote(proposed).error: return
	pending = proposed
	warning.text = ""
	refresh()

func refresh():
	var quote = host.session.attribute_quote(pending)
	shards.configure(host.data, quote.remaining)
	price.configure(host.data, quote.nextCost)
	price.tooltip_text = "Цена следующего повышения характеристики на 1: %d осколков" % quote.nextCost
	for stat in rows:
		rows[stat].refresh(int(baseline[stat]), int(pending.get(stat, 0)), quote.remaining >= quote.nextCost and not quote.error)
	confirm.disabled = locked or quote.points == 0 or not quote.error.is_empty()
	if locked: warning.text = locked_reason
	arrange()

func commit():
	if locked or confirm.disabled or host.busy: return
	var previous = host.session.game.duplicate(true)
	var error = host.session.upgrade_attributes(pending, baseline, initial_shards)
	if error:
		warning.text = error
		return
	if not host.persist():
		host.session.game = previous
		warning.text = host.saves.error
		return
	baseline = host.session.game.player.stats.duplicate(true)
	initial_shards = int(host.session.game.souls)
	pending.clear()
	warning.text = ""
	refresh()
	host.message("")
	host.refresh_character_header()
	applied.emit()

func layout_content():
	if rows.is_empty(): return
	if wide:
		put(shards, 40, 2, 280, 46)
		put(price, 376, 7, 304, 38)
		for i in host.data.STATS.size(): put(rows[host.data.STATS[i]], 2 + (i % 2) * 360,  60 + (i / 2) * 78, 356, 70)
		put(divider, 2, 57, 716, divider.THICKNESS)
		put(warning, 180, 217, 360, 36)
		put(confirm, 202, 254, 316, ACTION_HEIGHT)
	else:
		put(shards, 8, 8, 344, 52)
		put(price, 8, 60, 344, 36)
		for i in host.data.STATS.size(): put(rows[host.data.STATS[i]], 4, 114 + i * 77, 352, 68)
		put(divider, 4, 111, 352, divider.THICKNESS)
		put(warning, 12, 473, 336, 36)
		put(confirm, 18, 512, 324, ACTION_HEIGHT)
