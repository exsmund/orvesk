extends SceneTree
## Map geometry, state presentation and start-camp semantics; no disk saves.
var ui
var failures: Array = []
var checks = 0
var output = ""
class MemorySaves extends RefCounted:
	var error = ""
	func list_heroes(): return []
	func write(_id, _session, _draft): return true
class MemoryPreferences extends RefCounted:
	var completed_difficulties: Array = []
	func record_completed(ids):
		for id in ids:
			if id not in completed_difficulties: completed_difficulties.append(id)
		return true
	var last_hero = ""
	func write(): return true
func _initialize(): call_deferred("run")
func check(ok: bool, message: String):
	checks += 1
	if not ok: failures.append(message); printerr("FAIL: " + message)
func settle():
	for _i in 10: await process_frame
func shot(name: String):
	await settle()
	if output and DisplayServer.get_name() != "headless":
		await RenderingServer.frame_post_draw
		root.get_texture().get_image().save_png(output.path_join(name + ".png"))
func run():
	if not OS.get_cmdline_user_args().is_empty(): output = OS.get_cmdline_user_args()[0]
	ui = load("res://scenes/main.tscn").instantiate()
	ui.saves = MemorySaves.new()
	ui.preferences = MemoryPreferences.new()
	ui.session = preload("res://tests/campaign_driver.gd").new(ui.data)
	root.add_child(ui)
	await settle()
	var s = ui.session
	s.combat.rng.seed = 43
	check(s.create("Зая", {"strength":2,"agility":2,"vitality":2,"intelligence":1}, ui.data.portraits[0].id).is_empty(), "create")
	for chapter in range(1,7):
		s.game.player.hp = 1
		s.game.player.stamina = 0
		s.map_fixture(chapter)
		check(s.current_node() == "camp-start", "Chapter starts at camp")
		check(s.game.player.hp == ui.data.max_hp(s.game.player) and s.game.player.stamina == ui.data.max_stamina(s.game.player), "Start camp heals both resources")
		check(["camp-start", "fight-1"] in s.game.journey.map.edges, "Camp links first battle")
		s.game.player.hp = 1
		s.game.player.stamina = 0
		s.reset_chapter()
		check(s.current_node() == "camp-start" and s.game.player.hp == ui.data.max_hp(s.game.player) and s.game.player.stamina == ui.data.max_stamina(s.game.player), "Rebirth at camp heals")
	s.map_fixture(1)
	ui.show_game()
	await settle()
	check(ui.journey_view.selected.is_empty() and not ui.journey_view.detail.visible, "Fresh map has no selection/panel")
	# Enter first battle, finish it and resolve the reward through actual transitions.
	s.travel("fight-1")
	s.game.phase = "victory"
	s.finish_battle()
	s.reward(0)
	if s.game.get("victoryReward", {}).get("progressionPending", false): s.complete_reward()
	ui.show_game()
	await settle()
	check(ui.journey_view.selected.is_empty() and not ui.journey_view.detail.visible, "Returning from fight/dialogue clears selection")
	check("camp-1" in s.available_nodes(), "Stop has available camp")
	s.game.journey.lostSouls = {"nodeId":"fight-5", "amount":12}
	ui.show_game()
	await settle()
	var view = ui.journey_view
	check(view.map_view.shard_badge.visible and view.map_view.shard_badge.amount == 12, "Lost shards on defeating enemy")
	var before = JSON.stringify(s.game)
	var rng = s.combat.rng.state
	for pixels in [Vector2i(432,1008),Vector2i(320,640),Vector2i(1008,432),Vector2i(896,800)]:
		root.size = pixels
		await settle()
		var map = view.map_view
		check(view.map_scroll.get_global_rect().is_equal_approx(view.get_viewport_rect()), "Map scroll covers viewport edge to edge")
		check(ui.overlay.color.a == 0, "Map backdrop has no dark overlay")
		for id in map.markers:
			check(map.markers[id].size.is_equal_approx(view.header.frames[0].size), "Every marker equals header portrait")
		for edge in s.game.journey.map.edges:
			var a: Vector2 = map.centers[edge[0]]
			var b: Vector2 = map.centers[edge[1]]
			var route = map.edge_points(a,b)
			check(route[0] == a and route[-1] == b, "Connector uses centers")
			check(route.size() == 2, "Each connector is a single straight segment")
		for parent in s.game.journey.map.nodes:
			var branches: Array = s.game.journey.map.edges.filter(func(edge): return edge[0] == parent.id).map(func(edge): return map.centers[edge[1]])
			if branches.size() < 2: continue
			branches.sort_custom(func(a,b): return a.x < b.x)
			var first: Vector2 = branches.front() - map.centers[parent.id]
			var last: Vector2 = branches.back() - map.centers[parent.id]
			check(absf(rad_to_deg(first.angle_to(last))) > 89.9 and absf(rad_to_deg(first.angle_to(last))) < 90.1, "Outer branch arms form 90 degrees")
		var active = map.get_global_transform() * map.active_center()
		check(absf(active.x - view.get_global_rect().get_center().x) <= 2 and absf(active.y - view.get_global_rect().get_center().y) <= 2, "Available nodes centered on opening/resize")
		view.select_node("camp-1")
		await settle()
		check(view.detail.visible and not view.action.disabled, "Camp preview actionable")
		check(view.detail_icon.texture == ui.data.image("/map-points/symbols/campfire.png"), "Panel uses cutout symbol")
		check(view.get_global_rect().grow(1).encloses(view.detail.get_global_rect()), "Panel fits screen")
		check(view.detail_icon.position.y < 0, "Symbol protrudes above dialogue frame")
		check(is_equal_approx(view.detail_icon.size.x, minf(132, view.detail.size.x * 0.35) * 1.5), "Illustration is 1.5 times larger")
		check(view.detail_shadow.shading.shader == view.header.shading.shader, "Details use header shadow")
		check(map.markers["camp-start"].material.get_shader_parameter("grayscale"), "Completed camp monochrome")
		check(map.markers[s.current_node()].material.get_shader_parameter("content_texture") == ui.data.portrait(s.game.player), "Current node composites hero into common frame")
		check(map.markers["fight-5"].material.get_shader_parameter("show_content"), "Defeating boss remains visible next to lost shards")
		check(not map.markers["fight-4"].material.get_shader_parameter("show_content"), "Unvisited future encounter stays hidden")
	check(JSON.stringify(s.game) == before and s.combat.rng.state == rng, "Viewing preserves session and RNG")
	root.size = Vector2i(432,1008)
	await shot("map-camp-selected")
	view.select_node("")
	await shot("map-unselected")
	# Restore persists routes and location, without granting a free heal.
	s.game.player.hp = 1
	var restored = preload("res://game/session.gd").new(ui.data)
	check(restored.restore({"game":s.game.duplicate(true),"rngState":str(rng)}).is_empty(), "Restore map")
	check(restored.game.player.hp == 1 and restored.game.journey.map == s.game.journey.map and restored.current_node() == s.current_node(), "Restore does not heal or reroll")
	# Once an alternative is chosen, the other route is past, not a future mystery.
	s.travel("camp-1")
	ui.show_game()
	await settle()
	view = ui.journey_view
	view.select_node("forge-1")
	await settle()
	check(view.map_view.is_skipped(ui.data.lookup(s.game.journey.map.nodes,"forge-1")), "Abandoned branch detected")
	check(view.detail_title.text == ui.data.lookup(s.game.journey.map.nodes,"forge-1").name and view.description.text == "Этот путь уже недоступен.", "Skipped route has real name and final unavailability")
	check(view.map_view.markers["forge-1"].material.get_shader_parameter("grayscale") and view.map_view.markers["forge-1"].material.get_shader_parameter("show_content"), "Skipped icon revealed and monochrome")
	check(view.action.disabled and not view.action.visible, "Skipped destination cannot be entered")
	await shot("map-skipped")
	s.map_fixture(2)
	# Display an authored stop with up to four alternatives, not a synthetic graph.
	s.game.journey.path = ["camp-start", "fight-1", "fight-2"]
	s.campaign.seek(ui.data.story.stages["2.4"].activityChoice, true)
	ui.show_game()
	await settle()
	check(s.available_nodes().size() >= 3, "Multi-option route fixture")
	await shot("map-multiple-routes")
	check(not ui.journey_view.map_view.shard_badge.visible, "No zero/missing shard badge")
	ui.free()
	print("JOURNEY_MAP: %d checks, %d failures" % [checks,failures.size()])
	quit(1 if failures else 0)
