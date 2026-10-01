extends "res://scripts/preview_portraits.gd"
const Modal = preload("res://ui/modal_dialog.gd")
var checks = 0
var failures: Array = []
var output = ""
func check(ok: bool, text: String):
	checks += 1
	if not ok: failures.append(text); printerr("FAIL: "+text)
func move(id: String,n: int = 0,r: int = 0) -> Dictionary:
	return {"id":id,"x":n%3,"y":int(n/3),"rotation":r}
func shot(name: String):
	await settle()
	if output and DisplayServer.get_name() != "headless":
		RenderingServer.force_draw(false)
		root.get_texture().get_image().save_png(output.path_join(name+".png"))
func text_of(node: Node) -> String:
	var result = node.get_parsed_text() if node is RichTextLabel else (str(node.text) if node is Label else "")
	for child in node.get_children(): result += "\n"+text_of(child)
	return result
func run():
	if not OS.get_cmdline_user_args().is_empty(): output = OS.get_cmdline_user_args()[0]
	await open_mode("combat")
	var g = ui.session.game
	var combat = ui.session.combat
	g.player.gear = {"weapon":"soldier-spear","shield":null,"feet":null,"body":null}
	var deck = combat.build_deck(g.player)
	var mixed = deck.filter(func(c):return combat.Actions.mixed(c))[0]
	var hit = {"id":"enemy-hit","name":"Удар","category":"attack","shape":[[0,0],[1,0],[2,0]],"staminaCost":0,"art":"/basic-equipment/fist.png","healthDamage":{"base":3,"stats":[],"types":{"blunt":1}}}
	g.player.deck.hand = [mixed,deck[0]]
	g.enemy.deck.hand = [hit]
	g.player.stamina = 8
	g.clashPlan = {"stage":"reaction","preparer":"enemy","reactor":"player","playerPlaced":[],"enemyPlaced":[move(hit.id)],"playerModifiers":{},"enemyModifiers":{}}
	ui.draft = [move(mixed.id)]
	ui.show_game()
	for pixels in [Vector2i(432,1008),Vector2i(1008,700)]:
		root.size = pixels
		await settle()
		var board = ui.board
		var art = ui.combat_view.art
		check(art.texture_for(board.player_layer[0]) == ui.data.image("/actions/spear-guard.png"),"guard cell uses its own illustration")
		check(art.texture_for(board.player_layer[2]) == ui.data.image("/weapons/soldier-spear.png"),"tip uses weapon illustration")
		check(board.damage_cells[0].playerDamage == 0 and board.damage_cells[2].playerDamage > 0,"board forecast distinguishes guard and attack")
		await shot("mixed-"+str(pixels.x))
	# Existing hold flow shows full figure and explains selected cell.
	ui.board.held.emit(ui.board.global_position+ui.board.cell_rect(0).get_center())
	await settle()
	var dialogs = ui.get_children().filter(func(c):return c is Modal and c.visible and not c.closing)
	check(dialogs.size() == 1,"hold opens one existing figure window")
	if not dialogs.is_empty():
		check(text_of(dialogs[0]).contains("В этой клетке: Перехват древком"),"selected guard has an explicit explanation")
		check(text_of(dialogs[0]).contains("Смешанная фигура") and text_of(dialogs[0]).contains("клеток: 2"),"inspection explains all cell groups")
		await shot("mixed-description")
		dialogs[0].close()
	await settle()
	ui.draft = [move(mixed.id,0,2)]
	ui.combat_view.refresh()
	await settle()
	check(combat.is_strike(ui.board.player_layer[0]) and ui.board.player_layer[2].get("blocks",false),"rotated board resolves correct images/actions")
	g.clashPlan.playerModifiers.compressed = mixed.id
	ui.draft = [move(mixed.id)]
	ui.combat_view.refresh()
	await settle()
	check(ui.combat_view.art.display_actions(ui.board.player_layer[0]).size() == 2,"compression shows both distinct action pictures")
	check(ui.board.damage_cells[0].playerDamage == 0,"compressed defense remains visible and functional")
	await shot("mixed-compressed")
	# Drag preview uses original profile order after rotation, without committing.
	g.clashPlan.playerModifiers.erase("compressed")
	ui.draft = []
	ui.combat_view.refresh()
	ui.rotations[mixed.id] = 1
	var view = ui.combat_view
	var card_button = view.cards.filter(func(c):return c.card_id == mixed.id)[0]
	view.start_drag(mixed.id,card_button.get_global_rect().get_center(),card_button)
	var pitch = view.board.size.x/3
	view.move_drag(view.board.global_position+Vector2(pitch/2-1.5,pitch*3-3))
	await settle()
	check(view.drop_valid and view.board.preview == [0,3,6],"dragged mixed column fits expected cells")
	check(view.board.player_layer[0].get("blocks",false) and combat.is_strike(view.board.player_layer[6]),"live drag uses cell profiles in rotated order")
	await shot("mixed-drag")
	view.end_drag(view.drag_point,true)
	check(ui.draft.is_empty(),"canceled preview does not place the figure")
	ui.hero_id = ""
	print("MIXED_FIGURES_UI: %d checks; %d failures" % [checks,failures.size()])
	quit(0 if failures.is_empty() else 1)
