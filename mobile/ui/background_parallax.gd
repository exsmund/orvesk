extends TextureRect
## Only the scenery moves. Extra coverage prevents exposed viewport edges.
const TRAVEL = 10.0
const OVERSCAN = TRAVEL + 2.0
const TILT_RANGE = 0.35
const RESPONSE = 5.0
var neutral = Vector2.ZERO
var motion = Vector2.ZERO
var calibrated = false
var mobile_sensor = false

func _ready():
	mobile_sensor = OS.get_name() in ["Android", "iOS"]
	get_parent().resized.connect(recenter)
	set_process(mobile_sensor)
	recenter()

func recenter():
	calibrated = false
	motion = Vector2.ZERO
	apply_motion()

func _notification(what):
	if what == NOTIFICATION_APPLICATION_RESUMED:
		recenter()

func _process(delta: float):
	var gravity = Input.get_gravity()
	if gravity.length_squared() < 0.01:
		gravity = Input.get_accelerometer()
	update_motion(gravity, delta)

func update_motion(gravity: Vector3, delta: float):
	var target = Vector2.ZERO
	if gravity.is_finite() and gravity.length_squared() > 0.01:
		var direction = gravity.normalized()
		var tilt = Vector2(direction.x, -direction.y)
		if not calibrated:
			neutral = tilt
			calibrated = true
		var relative = (tilt - neutral) / TILT_RANGE
		target = -relative.clamp(Vector2(-1, -1), Vector2.ONE) * TRAVEL
	motion = motion.lerp(target, 1.0 - exp(-RESPONSE * maxf(0, delta)))
	apply_motion()

func apply_motion():
	var padding = OVERSCAN if mobile_sensor else 0.0
	offset_left = -padding + motion.x
	offset_top = -padding + motion.y
	offset_right = padding + motion.x
	offset_bottom = padding + motion.y
