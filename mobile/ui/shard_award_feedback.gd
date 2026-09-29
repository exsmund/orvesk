extends Control
## A short, non-blocking receipt animation; never changes the saved balance.
const DURATION = 1.2
var source
var recovered
var destination
var initial_balance = 0
var credited = 0
var elapsed = 0.0
var particles: Array = []
var finished = false

func configure(award_counter, recovered_counter, balance_counter):
	source = award_counter
	recovered = recovered_counter
	destination = balance_counter
	credited = source.amount + recovered.amount
	initial_balance = maxi(0, destination.amount - credited)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for i in mini(6, credited):
		var sprite = TextureRect.new()
		sprite.mouse_filter = Control.MOUSE_FILTER_IGNORE
		sprite.texture = destination.icon
		sprite.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		sprite.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		add_child(sprite)
		particles.append(sprite)
	update_feedback()

func _process(delta: float):
	if finished or not is_instance_valid(destination): return
	elapsed += delta
	if elapsed >= DURATION or destination.amount != initial_balance + credited:
		finish()
		return
	update_feedback()

func icon_area(counter) -> Rect2:
	var rect = counter.icon_rect
	if rect.size == Vector2.ZERO: rect = Rect2(counter.size * 0.5, Vector2(14, 22))
	return get_global_transform().affine_inverse() * counter.get_global_transform() * rect

func update_feedback():
	var receipt_progress = clampf(elapsed / 0.65, 0, 1)
	var balance_progress = clampf((elapsed - 0.28) / (DURATION - 0.28), 0, 1)
	source.displayed_amount = roundi(lerpf(0, source.amount, ease(receipt_progress, 0.5)))
	recovered.displayed_amount = roundi(lerpf(0, recovered.amount, ease(receipt_progress, 0.5)))
	destination.displayed_amount = initial_balance + roundi(credited * ease(balance_progress, 0.5))
	var end = icon_area(destination)
	for i in particles.size():
		var sprite = particles[i]
		var start = icon_area(recovered if source.amount == 0 or (recovered.amount > 0 and i % 2 == 1) else source)
		var t = clampf((elapsed - 0.12 - i * 0.045) / 0.78, 0, 1)
		var control = (start.get_center() + end.get_center()) * 0.5 + Vector2((i - (particles.size() - 1) * 0.5) * 18, -32)
		var point = start.get_center().lerp(control, t).lerp(control.lerp(end.get_center(), t), t)
		sprite.size = start.size.lerp(end.size, t)
		sprite.position = point - sprite.size * 0.5
		sprite.modulate.a = clampf(t * 8, 0, 1) * clampf((1 - t) * 6, 0, 1)

func finish():
	if finished: return
	finished = true
	for counter in [source, recovered, destination]:
		if is_instance_valid(counter): counter.displayed_amount = counter.amount
	hide()
	queue_free()
