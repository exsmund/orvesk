extends "res://scripts/preview_portraits.gd"
const Modal = preload("res://ui/modal_dialog.gd")
var checks = 0
var failures: Array = []
var output = ""
func check(ok: bool, text: String):
	checks += 1
	if not ok: failures.append(text); printerr("FAIL: "+text)
func move(id: String,n: int) -> Dictionary:
	return {"id":id,"x":n%3,"y":int(n/3),"rotation":0}
func shot(name: String):
	await settle()
	if output and DisplayServer.get_name() != "headless":
		RenderingServer.force_draw(false)
		root.get_texture().get_image().save_png(output.path_join(name+".png"))
func all_text(node: Node) -> String:
	var text = str(node.text) if node is Label else ""
	for child in node.get_children(): text += "\n" + all_text(child)
	return text
func run():
	if not OS.get_cmdline_user_args().is_empty(): output = OS.get_cmdline_user_args()[0]
	await open_mode("combat")
	var g = ui.session.game
	var combat = ui.session.combat
	g.player.gear = {"weapon":"dagger","shield":"buckler","body":null,"feet":"iron-boots"}
	var cards = combat.build_deck(g.player)
	var weapon = cards.filter(func(c): return c.get("sourceKind","") == "weapon" and c.shape.size()==1)[0]
	var guard = cards.filter(func(c): return c.get("blocks",false))[0]
	var kick = cards.filter(func(c): return c.get("sourceSlot","") == "feet")[0]
	g.player.deck.hand = [weapon,guard,kick]
	g.player.stamina = 8
	var hit = {"id":"test-enemy","name":"Удар","category":"attack","shape":[[0,0]],"staminaCost":1,"art":"/basic-equipment/fist.png","healthDamage":{"base":3,"stats":[],"types":{"blunt":1}}}
	g.enemy.deck.hand = [hit]
	g.clashPlan = {"stage":"reaction","preparer":"enemy","reactor":"player","playerPlaced":[],"enemyPlaced":[move(hit.id,3)],"playerModifiers":{},"enemyModifiers":{}}
	ui.draft = [move(weapon.id,0),move(guard.id,3),move(kick.id,6)]
	ui.show_game()
	for pixels in [Vector2i(432,1008),Vector2i(1008,700)]:
		root.size = pixels
		await settle()
		var board = ui.board
		check(board.combo_cell != null and board.combo_contested != null and board.combo_link != null and board.combo_glow != null,"all combo art loads, including the dedicated two-panel cell")
		check(range(9).all(func(n): return board.cell_rect(n).size.is_equal_approx(board.cell_rect(0).size)),"all nine cell interiors have equal size")
		check(range(9).all(func(n): return board.index_at(board.cell_rect(n).get_center()) == n),"aligned cells retain correct touch targets")
		check(board.player_combos(0).size()>0 and board.player_combos(3).size()>0,"player combo cells highlighted")
		check(board.player_combos(2).is_empty(),"unrelated cells not highlighted")
		await shot("combos-"+str(pixels.x))
	# Drive the existing long-press signal into the existing figure card modal.
	ui.board.held.emit(ui.board.global_position+ui.board.cell_rect(0).get_center())
	await settle()
	var dialog
	for child in ui.get_children():
		if child is Modal and child.visible and not child.closing: dialog = child
	check(dialog != null and all_text(dialog).contains("Прикрытый выпад") and all_text(dialog).contains("25%"),"long press opens figure card with textual combo bonus")
	await shot("combos-description")
	if dialog: dialog.close()
	await settle()
	# Swapping sides keeps the enemy mechanic but removes all player effect inputs.
	g.enemy = g.player.duplicate(true)
	g.player.deck.hand = [hit]
	g.clashPlan.enemyPlaced = ui.draft.duplicate(true)
	ui.draft = [move(hit.id,3)]
	ui.show_game()
	await settle()
	check(ui.board.damage_cells.any(func(c): return not c.get("enemyCombos",[]).is_empty()),"enemy really has combo")
	check(range(9).all(func(n): return ui.board.player_combos(n).is_empty()),"enemy combo has no texture glow or diamonds")
	await shot("combos-enemy-no-effects")
	ui.hero_id = ""
	print("COMBOS_UI: ",checks," checks; ",failures.size()," failures")
	quit(0 if failures.is_empty() else 1)
