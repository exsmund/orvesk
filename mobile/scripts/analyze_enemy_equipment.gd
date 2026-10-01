extends SceneTree
## Offline diagnostic: imports the production mobile combat and catalog; no saves.
const Catalog = preload("res://game/catalog.gd")
const Session = preload("res://game/session.gd")
const Player = preload("res://tests/first_map_player.gd")
var data = Catalog.new()
var session = Session.new(data)
var combat = session.combat
var records: Array = []
var failures: Array = []

func _initialize(): call_deferred("run")

func stats(rank: int, profile: String) -> Dictionary:
	var values = {"strength":1,"agility":1,"vitality":1,"intelligence":1}
	var points = rank + 2
	if profile == "balanced":
		values.strength += ceili(points / 2.0)
		values.vitality += floori(points / 2.0)
	else: values[profile] += points
	return values

var legacy
var variant = "new"

func actor(rank: int, profile: String, loadout: String) -> Dictionary:
	var f = session.fighter(profile, stats(rank, profile))
	data.wear(f, data.item("shortsword@%d" % f.stats.strength))
	if loadout != "no-armor":
		data.wear(f, data.item("rags@%d" % (1 if loadout == "weak-armor" else f.stats.strength)))
	return f

func simulate(rank: int, profile: String, enemy_profile: String, loadout: String, mode: String, first: String, sample: int) -> Dictionary:
	var p = actor(rank, profile, loadout)
	var generator = legacy.new(data) if variant == "old" else Session.new(data)
	generator.game = {"player":p,"journey":{"expedition":2,"startLevel":rank}}
	generator.combat.rng.seed = rank * 10000 + sample
	var e = generator.generate_enemy(5, {"kind":"human", "role":"Test"})
	var g = {"phase":"combat", "player":p, "enemy":e, "journey":{"battleMode":mode}}
	var hp_start = p.hp
	var enemy_hp_start = e.hp
	var pair_seed = rank * 100000 + sample * 100 + (0 if first == "player" else 50)
	# Each scenario reuses generation and draw seeds across old/new balance.
	# Gear can change the deck; this is a paired scenario, not identical card draws.
	combat.rng.seed = pair_seed + 1
	p.battleMode = mode
	combat.start_deck(p)
	combat.rng.seed = pair_seed + 2
	e.battleMode = mode
	combat.start_deck(e)
	g.round = 1
	g.log = []
	g.lastReactor = first
	combat.rng.seed = pair_seed + 3
	combat.prepare(g)
	if g.clashPlan.preparer != first: failures.append("Wrong initial turn")
	var capped = false
	var planning_rng = RandomNumberGenerator.new()
	planning_rng.seed = pair_seed + 4
	while g.phase == "combat" and g.round <= 120:
		# Bot search must not consume the game's draw/AI random stream.
		var game_rng = combat.rng.state
		combat.rng.state = planning_rng.state
		var moves = Player.plan(combat, g)
		planning_rng.state = combat.rng.state
		combat.rng.state = game_rng
		var error = combat.submit(g, moves)
		if error:
			failures.append(error)
			break
		if g.phase == "combat" and g.clashPlan.stage == "reveal":
			error = combat.submit(g, [])
			if error: failures.append(error);break
	if g.phase == "combat":
		capped = true
		failures.append("Battle exceeded 120 rounds")
	return {"variant":variant,"enemyGear":e.gear,"level":rank,"heroProfile":profile,"enemyProfile":enemy_profile,"loadout":loadout,"mode":mode,"first":first,"sample":sample,
		"heroStats":p.stats,"enemyStats":e.stats,"heroWeapon":p.gear.weapon,"enemyWeapon":e.gear.weapon,
		"outcome":g.phase,"rounds":g.round-1,"hpStart":hp_start,"hpEnd":maxf(0,p.hp),"enemyHpStart":enemy_hp_start,"enemyHpEnd":maxf(0,e.hp),
		"lossPercent":100.0*(hp_start-maxf(0,p.hp))/hp_start,"endedByHealthComparison":g.phase != "combat" and p.hp > 0 and e.hp > 0,"capped":capped}

func run():
	var args = OS.get_cmdline_user_args()
	var samples = int(args[0]) if args.size() else 3
	var output = args[1] if args.size() > 1 else "/tmp/enemy-balance.json"
	if args.size() > 2: legacy = load(args[2])
	for version in (["old", "new"] if legacy else ["new"]):
		variant = version
		for level in [3, 6, 10]:
			for loadout in ["no-armor", "weak-armor", "good-armor"]:
				for mode in ["free"]:
					var subset: Array = []
					for first in ["player", "enemy"]:
						for sample in range(1, samples + 1):
							var record = simulate(level, "balanced", "enemy", loadout, mode, first, sample)
							records.append(record)
							subset.append(record)
					print(version, " L",level," ",loadout," ",mode," wins=",subset.filter(func(r):return r.outcome=="victory").size(),"/",subset.size())
					await process_frame
	var file = FileAccess.open(output, FileAccess.WRITE)
	file.store_string(JSON.stringify({"failures":failures,"battles":records}, "\t"))
	file.close()
	print("DONE battles=", records.size(), " failures=", failures.size())
	quit(0 if failures.is_empty() else 1)
