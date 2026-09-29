extends SceneTree
var ui
var checks = 0
var failures: Array = []
var output = ""
class MemorySaves extends RefCounted:
	var error = "Тест: не удалось сохранить"
	var fail = false
	func list_heroes(): return []
	func write(_id, _session, _draft): return not fail
func check(value: bool, message: String):
	checks += 1
	if not value: failures.append(message);printerr("FAIL: " + message)
func _initialize(): call_deferred("run")
func settle():
	for _i in 8: await process_frame
func shot(name: String):
	await settle()
	if output and DisplayServer.get_name() != "headless":
		RenderingServer.force_draw(false)
		root.get_texture().get_image().save_png(output.path_join(name + ".png"))
func offer(id: String):
	ui.session.game.phase = "victory"
	ui.session.game.rewardOptions = [{"kind":"skill","skillId":id}]
	ui.show_game()
	ui.show_reward_details(0)
func run():
	root.gui_embed_subwindows = true
	root.size = Vector2i(432,1008)
	if not OS.get_cmdline_user_args().is_empty(): output = OS.get_cmdline_user_args()[0]
	ui = load("res://scenes/main.tscn").instantiate()
	ui.session = preload("res://tests/campaign_driver.gd").new(ui.data)
	ui.saves = MemorySaves.new()
	root.add_child(ui);await settle()
	ui.session.create("Навыки", {"strength":2,"agility":2,"vitality":1,"intelligence":2}, ui.data.portraits[0].id)
	ui.hero_id = "memory-skills"
	ui.session.travel("fight-1")
	ui.session.game.phase = "victory";ui.session.finish_battle()
	ui.session.game.souls = 10
	for known in [["reaction"],["tireless","reaction","bandage"]]:
		ui.session.game.player.skills = known.duplicate()
		offer("strategist")
		check(ui.skill_reward_hint("strategist").contains("Реакция"), "Reward explains forced replacement")
		ui.inspection_window.confirmed.emit();await settle()
		check(is_instance_valid(ui.inspection_window) and ui.inspection_window.cards.size() == 2, "Conflict opens comparison even with free slots")
		check(ui.inspection_window.cards[1].entry.reference == "reaction", "Comparison selects conflicting skill, not first slot")
		var before = ui.session.game.duplicate(true)
		ui.saves.fail = true
		ui.inspection_window.confirmed.emit();await settle()
		check(ui.session.game == before, "Failed persistence leaves both skill and reward unchanged")
		ui.saves.fail = false
		ui.inspection_window.confirmed.emit();await settle()
		var expected = known.duplicate();expected[known.find("reaction")] = "strategist"
		check(ui.session.game.player.skills == expected, "Successful conflict keeps all unrelated slots")
	ui.session.game.player.skills = []
	ui.session.game.player.hp = 12
	offer("robust-health")
	ui.inspection_window.confirmed.emit();await settle()
	check(ui.session.game.player.skills == ["robust-health"] and ui.session.game.player.hp == 12 and ui.data.max_hp(ui.session.game.player) == 70, "Reward enables passive without healing")
	ui.session.game.player.skills.append("tireless")
	ui.session.game.player.stamina = 10
	ui.show_character();ui.character_window.select_tab(1);await settle()
	check(ui.character_window.pages[1].rows.vitality.value.current_text == "3", "Attributes show effective vitality")
	await shot("skills-bonus-attributes")
	ui.character_window.select_tab(0);await shot("skills-bonus-resources")
	ui.character_window.close();await settle()
	var model = preload("res://ui/inspection_model.gd").new(ui.data,ui.session.combat)
	for pixels in [Vector2i(320,640),Vector2i(432,1008),Vector2i(1008,432)]:
		root.size = pixels
		var window = ui.open_inspection([[model.skill("step-back",ui.session.game.player)]],{"title":"Навык"})
		await shot("skills-retreat-%dx%d" % [pixels.x,pixels.y])
		check(window.cards[0].figure_rows.size() == 1 and window.cards[0].entry.figures[0].shape.size() == 9, "Full 3x3 skill visible in inspection")
		window.close();await settle()
	print("SKILLS_UI: %s (%d checks; %d failures)" % ["PASS" if failures.is_empty() else "FAIL",checks,failures.size()])
	quit(0 if failures.is_empty() else 1)
