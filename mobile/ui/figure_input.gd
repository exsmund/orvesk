extends Control
## One gesture owns a pointer until release; emulated mouse events cannot double-tap.
signal tapped(point: Vector2)
signal held(point: Vector2)
signal drag_started(point: Vector2)
signal drag_moved(point: Vector2)
signal drag_ended(point: Vector2, canceled: bool)
const HOLD_SECONDS = 0.5
const DRAG_DISTANCE = 10.0
var pointer = -3
var press_point = Vector2.ZERO
var last_point = Vector2.ZERO
var elapsed = 0.0
var dragging = false
var hold_fired = false
var interactive = true

func _gui_input(event):
	if not interactive or pointer != -3: return
	if event is InputEventScreenTouch and event.pressed:
		begin_pointer(event.index, event.position + global_position)
		accept_event()
	elif event is InputEventMouseButton and event.device != -1 and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		begin_pointer(-2, event.position + global_position)
		accept_event()

func begin_pointer(id: int, point: Vector2):
	pointer = id
	press_point = point
	last_point = point
	elapsed = 0.0
	dragging = false
	hold_fired = false

func _input(event):
	if pointer == -3: return
	if event is InputEventScreenDrag and event.index == pointer:
		move_pointer(event.position)
	elif event is InputEventScreenTouch and event.index == pointer and not event.pressed:
		end_pointer(event.position, event.canceled)
	elif pointer == -2 and event is InputEventMouseMotion and event.device != -1:
		move_pointer(event.position)
	elif pointer == -2 and event is InputEventMouseButton and event.device != -1 and event.button_index == MOUSE_BUTTON_LEFT and not event.pressed:
		end_pointer(event.position, event.canceled)

func move_pointer(point: Vector2):
	last_point = point
	if hold_fired: return
	if not dragging and point.distance_to(press_point) >= DRAG_DISTANCE:
		dragging = true
		drag_started.emit(press_point)
	if dragging: drag_moved.emit(point)

func end_pointer(point: Vector2, canceled: bool = false):
	var was_dragging = dragging
	var was_held = hold_fired
	pointer = -3
	dragging = false
	hold_fired = false
	if was_dragging: drag_ended.emit(point, canceled)
	elif not canceled and not was_held and get_global_rect().has_point(point): tapped.emit(point)

func _process(delta):
	if pointer == -3 or dragging or hold_fired: return
	elapsed += delta
	if elapsed >= HOLD_SECONDS:
		hold_fired = true
		# A popup may capture the release in a different Window. Finish ownership now.
		pointer = -3
		held.emit(press_point)

func cancel_gesture():
	if pointer != -3: end_pointer(last_point, true)

func _notification(what):
	if what in [NOTIFICATION_WM_WINDOW_FOCUS_OUT, NOTIFICATION_APPLICATION_PAUSED]: cancel_gesture()
