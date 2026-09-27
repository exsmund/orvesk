extends RefCounted
## App preferences are separate from hero saves and survive app updates.
var path: String
var animated = true
var last_hero = ""

func _init(file_path: String = "user://settings.cfg"):
	path = file_path
	var config = ConfigFile.new()
	if config.load(path) == OK:
		var animation_value = config.get_value("display", "resource_animation", true)
		if animation_value is bool: animated = animation_value
		var hero_value = config.get_value("session", "last_hero", "")
		if hero_value is String: last_hero = hero_value

func write() -> bool:
	var config = ConfigFile.new()
	config.set_value("display", "resource_animation", animated)
	config.set_value("session", "last_hero", last_hero)
	if config.save(path + ".tmp") != OK: return false
	return DirAccess.rename_absolute(path + ".tmp", path) == OK
