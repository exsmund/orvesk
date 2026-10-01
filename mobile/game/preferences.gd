extends RefCounted
## App preferences are separate from hero saves and survive app updates.
var path: String
var last_hero = ""
var completed_difficulties: Array = []

func _init(file_path: String = "user://settings.cfg"):
	path = file_path
	var config = ConfigFile.new()
	if config.load(path) == OK:
		var hero_value = config.get_value("session", "last_hero", "")
		if hero_value is String: last_hero = hero_value
		var completed = config.get_value("progress", "completed_difficulties", [])
		if completed is Array: completed_difficulties = completed.filter(func(id): return id is String)

func record_completed(ids: Array) -> bool:
	var before = completed_difficulties.duplicate()
	for id in ids:
		if id is String and id not in completed_difficulties: completed_difficulties.append(id)
	if before == completed_difficulties: return true
	if write(): return true
	completed_difficulties = before
	return false

func write() -> bool:
	var config = ConfigFile.new()
	config.set_value("session", "last_hero", last_hero)
	config.set_value("progress", "completed_difficulties", completed_difficulties)
	if config.save(path + ".tmp") != OK: return false
	return DirAccess.rename_absolute(path + ".tmp", path) == OK
