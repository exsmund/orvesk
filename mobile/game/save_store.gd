extends RefCounted
## Independent mobile format. Never reads or changes browser/Express saves.
const VERSION = 1
const GAME_VERSION = 7
const DIRECTORY = "user://heroes"
var error = ""
var folder = DIRECTORY

func _init(directory: String = DIRECTORY):
	folder = directory
	DirAccess.make_dir_recursive_absolute(folder)
	remove_legacy(folder)

func remove_legacy(folder: String) -> int:
	# This prototype intentionally starts a new campaign. Never delete unknown or
	# damaged files, or a newer format; only recognized pre-campaign hero payloads.
	var directory = DirAccess.open(folder)
	var removed = 0
	if directory == null: return removed
	for filename in directory.get_files():
		if not (filename.ends_with(".json") or filename.ends_with(".json.bak") or filename.ends_with(".json.tmp")): continue
		var file_path = folder.path_join(filename)
		var parsed = JSON.parse_string(FileAccess.get_file_as_string(file_path))
		if parsed is Dictionary and parsed.get("format") == VERSION and parsed.get("game") is Dictionary:
			var old_version = int(parsed.game.get("version", 0))
			if old_version > 0 and old_version < GAME_VERSION and DirAccess.remove_absolute(file_path) == OK: removed += 1
	return removed

func path(id: String) -> String:
	return folder + "/" + id.validate_filename() + ".json"

func valid(payload) -> bool:
	if not payload is Dictionary or payload.get("format", 0) != VERSION: return false
	var g = payload.get("game", {})
	if not g is Dictionary or g.get("version", 0) != GAME_VERSION: return false
	if not g.get("story") is Dictionary: return false
	if g.get("phase", "") not in ["ready", "combat", "victory", "defeat", "draw", "story", "ended"]: return false
	for side in ["player", "enemy"]:
		if not g.get(side) is Dictionary: return false
		for key in ["name", "stats", "gear", "hp", "stamina"]:
			if not g[side].has(key): return false
		for stat in ["strength", "agility", "vitality", "intelligence"]:
			if g[side].stats.get(stat, 0) < 1: return false
		if g.phase == "combat" and not g[side].get("deck") is Dictionary: return false
	return g.get("journey") is Dictionary and (g.phase != "combat" or g.get("clashPlan") is Dictionary)

func load_file(file_path: String) -> Dictionary:
	if not FileAccess.file_exists(file_path): return {}
	var parser = JSON.new()
	if parser.parse(FileAccess.get_file_as_string(file_path)) != OK: return {}
	var parsed = parser.data
	return parsed if valid(parsed) else {}

func read(id: String) -> Dictionary:
	error = ""
	var main = load_file(path(id))
	if not main.is_empty(): return main
	var backup = load_file(path(id) + ".bak")
	if not backup.is_empty():
		error = "Восстановлена резервная копия последнего сохранения."
		return backup
	error = "Сохранение повреждено или создано несовместимой версией. Файлы сохранены для восстановления."
	return {}

func write(id: String, session, draft: Array = []) -> bool:
	error = ""
	var destination = path(id)
	# Store RNG as decimal text: JSON numbers cannot preserve all 64 bits.
	var payload = {"format": VERSION, "game": session.game, "rngState": str(session.combat.rng.state), "draft": draft, "savedAt": Time.get_datetime_string_from_system(true)}
	var encoded = JSON.stringify(payload, "", false, true)
	var temporary = destination + ".tmp"
	var file = FileAccess.open(temporary, FileAccess.WRITE)
	if not file:
		error = "Не удалось открыть файл сохранения."
		return false
	file.store_string(encoded)
	file.flush()
	var write_error = file.get_error()
	file.close()
	if write_error != OK or load_file(temporary).is_empty():
		error = "Не удалось записать сохранение."
		return false
	# Preserve a known-good backup. Never replace it with a corrupt main file.
	if not load_file(destination).is_empty():
		var backup_error = DirAccess.copy_absolute(destination, destination + ".bak")
		if backup_error != OK:
			error = "Не удалось обновить резервную копию."
			return false
	if DirAccess.rename_absolute(temporary, destination) != OK:
		error = "Не удалось завершить сохранение."
		return false
	return true

func list_heroes() -> Array:
	var result: Array = []
	var directory = DirAccess.open(folder)
	if directory == null: return result
	for filename in directory.get_files():
		if not filename.ends_with(".json"): continue
		var id = filename.trim_suffix(".json")
		var payload = read(id)
		result.append({"id": id, "payload": payload})
	return result

func remove(id: String) -> bool:
	error = ""
	if id.is_empty() or id != id.validate_filename():
		error = "Некорректный идентификатор сохранения."
		return false
	# Main file is removed last. A failed backup removal leaves a loadable hero,
	# and a successful removal cannot resurrect the hero from its backup.
	for suffix in [".bak", ".tmp", ""]:
		var target = path(id) + suffix
		if FileAccess.file_exists(target) and DirAccess.remove_absolute(target) != OK:
			error = "Не удалось удалить сохранение. Попробуйте ещё раз."
			return false
	return true
