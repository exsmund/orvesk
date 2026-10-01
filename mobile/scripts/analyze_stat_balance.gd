extends SceneTree
## Headless balance matrix worker. Use run_balance.py to run/merge/resume workers.
const Catalog = preload("res://tests/balance_catalog.gd")
const Scenarios = preload("res://tests/balance_scenarios.gd")
var data = Catalog.new()
var suite = Scenarios.new(data)

func _initialize(): call_deferred("run")

func fail(message: String):
	printerr("BALANCE_ERROR: " + message)
	quit(1)

func run():
	var options = {"samples": "20", "seed": "20260929", "output": "/tmp/orvesk-balance", "worker": "0", "workers": "1", "levels": "2,5,10,20,50,100", "builds": "", "max-rounds": "500", "describe": "false"}
	var args = OS.get_cmdline_user_args()
	if args.size() % 2:
		fail("Arguments must be --name value pairs")
		return
	for i in range(0, args.size(), 2):
		var key = args[i].trim_prefix("--")
		if not options.has(key):
			fail("Unknown argument: " + args[i])
			return
		options[key] = args[i + 1]
	var samples = int(options.samples)
	var workers = int(options.workers)
	var worker = int(options.worker)
	var max_rounds = int(options["max-rounds"])
	if samples < 2 or samples % 2 or workers < 1 or worker < 0 or worker >= workers or max_rounds < 1:
		fail("Samples must be positive and even; invalid worker or round limit")
		return
	var root = ProjectSettings.globalize_path("res://").get_base_dir().get_base_dir()
	var output: String = options.output.simplify_path()
	if not output.is_absolute_path() or output == root or output.begins_with(root + "/"):
		fail("Reports must be outside the repository")
		return
	var levels: Array = []
	for value in options.levels.split(","):
		if not value.is_valid_int() or int(value) < 1:
			fail("Invalid level: " + value)
			return
		levels.append(int(value))
	var builds: Array = Scenarios.BUILDS
	if options.builds:
		var ids = options.builds.split(",")
		builds = builds.filter(func(b): return b.id in ids)
		if builds.size() != ids.size():
			fail("Unknown or duplicate build")
			return
	var cases = suite.cases(levels, builds)
	DirAccess.make_dir_recursive_absolute(output.path_join("cases"))
	if options.describe == "true":
		var description = FileAccess.open(output.path_join("suite.json"), FileAccess.WRITE)
		description.store_string(JSON.stringify({"cases": cases, "creatureIds": suite.creature_ids, "builds": builds}, "\t"))
		description.close()
		quit(0)
		return
	var started = Time.get_ticks_msec()
	var completed = 0
	for index in cases.size():
		if index % workers != worker: continue
		var scenario = cases[index]
		var path = output.path_join("cases").path_join(scenario.id.replace(":", "-") + ".json")
		# The launcher verifies configuration/code fingerprints before enabling resume.
		if FileAccess.file_exists(path): continue
		var records: Array = []
		var wins = 0
		var draws = 0
		var turns = 0
		for sample in samples:
			# Independent per-case seeds, unaffected by worker count, filters or resume.
			var seed_value = (str(options.seed) + ":" + scenario.id).sha256_text().substr(0, 8).hex_to_int() * 100000 + sample * 10
			var first = "player" if sample % 2 == 0 else "enemy"
			var record = suite.simulate(scenario, seed_value, first, max_rounds)
			record.sample = sample
			records.append(record)
			if record.has("error"):
				var diagnostic = FileAccess.open(output.path_join("failure-%d.json" % worker), FileAccess.WRITE)
				diagnostic.store_string(JSON.stringify({"scenario": scenario, "record": record}, "\t"))
				diagnostic.close()
				fail("%s sample %d: %s (seed %d)" % [scenario.id, sample, record.error, seed_value])
				return
			wins += int(record.outcome == "victory")
			draws += int(record.outcome == "draw")
			turns += record.rounds
		var result = {"scenario": scenario, "samples": samples, "seed": options.seed, "wins": wins,
			"losses": samples - wins, "draws": draws, "winPercent": 100.0 * wins / samples,
			"meanRounds": float(turns) / samples, "battles": records}
		# Atomic case checkpoints; an interrupted case is rerun in full.
		var file = FileAccess.open(path + ".tmp", FileAccess.WRITE)
		if file == null:
			fail("Cannot create report: " + path)
			return
		file.store_string(JSON.stringify(result, "\t"))
		file.close()
		if DirAccess.rename_absolute(path + ".tmp", path) != OK:
			fail("Cannot finish report: " + path)
			return
		completed += 1
		print("BALANCE_CASE ", scenario.id, " wins=", wins, "/", samples, " draws=", draws, " meanRounds=", result.meanRounds, " seconds=", (Time.get_ticks_msec()-started)/1000.0)
		await process_frame
	print("BALANCE_DONE worker=", worker, " completed=", completed)
	quit(0)
