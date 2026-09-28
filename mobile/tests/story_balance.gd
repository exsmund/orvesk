extends SceneTree
## Diagnostic sample for authored chapter-one opponents, separate from the five
## introductory catalog regression profiles. Does not change canonical balance.
const Catalog = preload("res://game/catalog.gd")
const Session = preload("res://tests/campaign_driver.gd")
const Player = preload("res://tests/first_map_player.gd")
func _initialize(): call_deferred("run")
func run():
	var data = Catalog.new()
	var results: Array = []
	for stage in range(1,6):
		var wins = 0
		var total = 0
		var name = ""
		for first in ["player","enemy"]:
			for seed_value in range(1,11):
				var session = Session.new(data)
				session.combat.rng.seed = stage*1000+seed_value
				session.create("Контроль", {"strength":1,"agility":1,"vitality":1,"intelligence":4},data.portraits[0].id)
				session.fight_fixture(stage)
				name = session.game.enemy.name
				if session.game.clashPlan.preparer != first:
					session.game.erase("clashPlan")
					session.game.lastReactor = first
					session.combat.prepare(session.game)
				for _turn in 100:
					if session.game.phase != "combat": break
					var error = session.submit(Player.plan(session.combat,session.game))
					if error:
						printerr(error);quit(1);return
				wins += int(session.game.phase == "victory")
				total += 1
				await process_frame
		results.append({"stage":stage,"name":name,"wins":wins,"battles":total})
		print("STORY_BALANCE: ",results.back())
	var args = OS.get_cmdline_user_args()
	if not args.is_empty():
		var file = FileAccess.open(args[0],FileAccess.WRITE)
		file.store_string(JSON.stringify(results,"\t"));file.close()
	quit()
