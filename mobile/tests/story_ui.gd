extends SceneTree
var ui
var checks = 0
var failures: Array = []
var output = ""
class MemorySaves extends RefCounted:
	var error = "Проверка сбоя записи"
	var fail = false
	var payload = {}
	func list_heroes(): return []
	func write(_id, session, draft):
		if fail: return false
		payload = {"game":session.game.duplicate(true),"rngState":str(session.combat.rng.state),"draft":draft.duplicate(true)}
		return true

func _initialize(): call_deferred("run")
func check(ok: bool, label: String):
	checks += 1
	if not ok: failures.append(label); printerr("FAIL: " + label)
func settle():
	for _i in 8: await process_frame
func shot(name: String):
	if output and DisplayServer.get_name() != "headless":
		await RenderingServer.frame_post_draw
		root.get_texture().get_image().save_png(output.path_join(name+".png"))

func inspect(name: String):
	for pixels in [Vector2i(320,640),Vector2i(432,1008),Vector2i(896,800),Vector2i(1008,432),Vector2i(2240,900)]:
		root.size = pixels
		await settle()
		var view = ui.story_view
		var bounds = view.get_global_rect().grow(1)
		check(bounds.encloses(view.header.get_global_rect()), "shared header fits " + name)
		check(bounds.encloses(view.controls.get_global_rect()), "answers fit " + name)
		check(view.words.get_global_rect().end.y <= view.controls.get_global_rect().position.y, "text ends above answers " + name)
		check(view.words.size.y > 32 and view.text_scroll.size.y > 24, "text remains readable " + name)
		if view.has_portrait:
			check(view.portrait.texture != null, "portrait from catalog")
			check(view.surface.get_global_rect().encloses(view.portrait.get_global_rect()), "portrait fits " + name)
		check(not view.text_scroll.get_v_scroll_bar().visible, "no visible scroll bar")
		if pixels in [Vector2i(432,1008),Vector2i(1008,432)]: await shot(name+"-%dx%d" % [pixels.x,pixels.y])

func run():
	var args = OS.get_cmdline_user_args()
	if not args.is_empty(): output = args[0]
	ui = load("res://scenes/main.tscn").instantiate()
	ui.saves = MemorySaves.new()
	root.add_child(ui)
	ui.hero_id = "memory-story"
	ui.session.create("Вереск", {"strength":2,"agility":2,"vitality":2,"intelligence":1},ui.data.portraits[0].id)
	ui.show_game()
	await inspect("narration")
	var before = ui.session.game.duplicate(true)
	var rng = ui.session.combat.rng.state
	ui.saves.fail = true
	ui.story_view.controls.get_child(0).pressed.emit()
	check(ui.session.game == before and ui.session.combat.rng.state == rng, "failed write rolls back dialogue")
	ui.saves.fail = false
	ui.story_view.controls.get_child(0).pressed.emit()
	await inspect("dialogue")
	check(ui.saves.payload.game == ui.session.game, "successful dialogue saved")
	for _i in 12:
		if ui.session.campaign.node().kind == "choice": break
		ui.story_view.controls.get_child(0).pressed.emit()
	await inspect("choice")
	check(ui.story_view.controls.get_child_count() == 3, "all motivation choices available")
	ui.story_view.controls.get_child(1).pressed.emit()
	for _i in 6:
		if ui.session.game.story.state.motivation != null: break
		ui.story_view.controls.get_child(0).pressed.emit()
	check(ui.session.game.story.state.motivation == "help", "choice applies its configured effect")
	ui.show_character()
	check(is_instance_valid(ui.character_window), "portrait opens character tabs during dialogue")
	ui.character_window.close()
	for _i in 30:
		if ui.session.game.phase != "story": break
		ui.story_view.controls.get_child(0).pressed.emit()
	check(ui.session.game.phase == "ready" and is_instance_valid(ui.journey_view), "prologue leads to map")
	root.size = Vector2i(432,1008)
	await settle()
	await shot("story-map")
	for point in ui.session.game.journey.map.nodes:
		check(ui.data.point_for_node(point).icon.src.begins_with("/ui/map-points/"), "new configured map icon")
	var before_choice = ui.session.game.duplicate(true)
	ui.session.game.phase = "story"
	ui.session.game.story.node = "6.4.33d08aac420d"
	ui.session.game.story.scene = "6.4"
	ui.show_game()
	await inspect("long-questions")
	ui.session.game = before_choice
	ui.hero_id = ""
	ui.queue_free()
	await process_frame
	print("STORY_UI: %d checks, %d failures" % [checks,failures.size()])
	quit(0 if failures.is_empty() else 1)
