extends RefCounted
## Build configuration, never a player preference or a saved-game field.
const DEBUG_TOOLS = "debug_tools"

static func enabled(feature: String) -> bool:
	return ProjectSettings.get_setting("features/" + feature, false) == true
