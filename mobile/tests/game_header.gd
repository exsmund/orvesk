extends SceneTree
const ModalDialog = preload("res://ui/modal_dialog.gd")
## Resizing/overflow and shared-header integration. All progress is memory-only.
const Header = preload("res://ui/game_header.gd")
const Layout = preload("res://ui/adaptive_layout.gd")
const SIZES = [Vector2i(432,1008),Vector2i(896,800),Vector2i(1600,800),Vector2i(320,640),Vector2i(1008,432),Vector2i(2240,900)]
var ui
var failures: Array = []
var checks = 0
var output = ""

class MemorySaves extends RefCounted:
	var error = ""
	func list_heroes(): return []
	func write(_id, _session, _draft): return true
class MemoryPreferences extends RefCounted:
	var animated = false
	var last_hero = ""
	func write(): return true

func _initialize(): call_deferred("run")
func check(ok: bool, message: String):
	checks += 1
	if not ok:
		failures.append(message)
		printerr("FAIL: " + message)
func settle():
	for _i in 10: await process_frame
func shot(name: String):
	await settle()
	if output and DisplayServer.get_name() != "headless":
		RenderingServer.force_draw(false)
		root.get_texture().get_image().save_png(output.path_join(name + ".png"))
func line_fits(label: Label):
	check(label.get_theme_font("font").get_string_size(label.text, HORIZONTAL_ALIGNMENT_LEFT, -1, label.get_theme_font_size("font_size")).x <= label.size.x + 1, "Single line fits: " + label.text)
	check(label.autowrap_mode == TextServer.AUTOWRAP_OFF, "Header never wraps")
func inspect(header):
	inspect_placement(header)
	var rect = header.get_global_rect().grow(1)
	for node in [header.player_portrait, header.player_bars, header.mode_icon, header.map_number, header.title, header.divider]:
		check(rect.encloses(node.get_global_rect()), "Header child stays in frame: " + node.get_class())
	line_fits(header.title)
	line_fits(header.map_number)
	check(header.map_number.text == str(int(ui.session.game.journey.expedition)), "Map number comes from saved expedition")
	check(header.player_portrait.get_rect().end.x <= header.player_bars.position.x + 1, "Portrait does not cover numbers")
	check(header.player_bars.get_rect().end.x < header.mode_icon.position.x, "Bars do not cover mode")
	check(is_equal_approx(header.frames[0].position.x, header.frames[0].position.y), "Player portrait has equal top and left frame insets")
	check(header.frames[0].get_rect().end.y < header.divider.get_rect().get_center().y, "Lowered portrait remains above divider")
	var reference_size = header.bars[0].value_label.get_theme_font_size("font_size")
	for i in (2 if header.journey_mode else 4):
		var bar = header.bars[i]
		check(not bar.icon.visible and not bar.label.visible, "Header has no resource icons/names")
		check(bar.value_label.get_theme_font_size("font_size") == reference_size and bar.forecast_label.get_theme_font_size("font_size") == reference_size, "All resources and forecasts share a fitted font size")
		line_fits(bar.value_label)
		check(bar.value_label.get_global_rect().position.x <= bar.track.get_global_rect().position.x + 1, "Current resource is left aligned")
		check(bar.value_label.get_global_rect().end.y <= bar.track.get_global_rect().position.y + 1, "Numbers remain above bar")
		if bar.forecast_label.visible:
			line_fits(bar.forecast_label)
			check(bar.value_label.get_global_rect().end.x <= bar.forecast_label.get_global_rect().position.x, "Current and forecast do not overlap")
			check(absf(bar.forecast_label.get_global_rect().end.x - bar.track.get_global_rect().end.x) <= 1, "Forecast is right aligned")
	if header.journey_mode:
		check(not header.enemy_portrait.visible and header.shards.visible, "Map uses shared shard counter")
		check(header.shards.amount == int(ui.session.game.souls), "Live shard balance")
		if DisplayServer.get_name() != "headless":
			check(Rect2(Vector2.ZERO,header.shards.size).grow(1).encloses(header.shards.icon_rect), "Even long shard balance fits")
			check(is_equal_approx(header.shards.icon_rect.size.y, header.shards.number_rect.size.y * 1.32), "Shard silhouette enlarged relative to numerals")
	else:
		check(rect.encloses(header.enemy_portrait.get_global_rect()) and rect.encloses(header.enemy_bars.get_global_rect()), "Enemy lane fits")
		check(header.enemy_bars.get_rect().end.x <= header.enemy_portrait.position.x + 1, "Enemy portrait does not cover numbers")
		check(is_equal_approx(header.size.x - header.frames[1].get_rect().end.x, header.frames[1].position.y), "Enemy portrait has equal top and right frame insets")
	if DisplayServer.get_name() != "headless":
		check(is_equal_approx(header.divider.diamond_rect.size.y, header.divider.ORNAMENT_HEIGHT), "Diamond height never stretches")
		check(is_equal_approx(header.divider.diamond_rect.size.x / header.divider.diamond_rect.size.y, 200.0 / 154.0), "Diamond retains source proportions")

func inspect_placement(header):
	var frame = header.get_global_rect()
	var left = ui.margin.get_theme_constant("margin_left")
	var right = ui.margin.get_theme_constant("margin_right")
	var top = ui.margin.get_theme_constant("margin_top")
	var bottom = ui.margin.get_theme_constant("margin_bottom")
	var bounds = Layout.content_rect(ui.size - Vector2(left + right, top + bottom))
	check(is_equal_approx(frame.position.x, ui.global_position.x + left + bounds.position.x) and is_equal_approx(frame.size.x, bounds.size.x), "Every game header uses the shared centered width limit")
	check(is_equal_approx(frame.position.y, ui.global_position.y + top) and is_equal_approx(frame.size.y, Header.HEIGHT), "Every game header has the same height and top inset")
	var ancestor = header.get_parent()
	while ancestor != null:
		if ancestor is Control: check(not ancestor.clip_contents, "Header/shadow has no clipping ancestor: " + ancestor.get_class())
		ancestor = ancestor.get_parent()
	var shadow = header.shadow.get_global_rect()
	check(ui.get_global_rect().grow(1).encloses(shadow), "Shadow fades inside viewport, without cutting off its edges")
	check(shadow.position.x < frame.position.x and shadow.position.y < frame.position.y and shadow.end.x > frame.end.x and shadow.end.y > frame.end.y, "Shadow extends past all four frame edges")

func page_headers():
	return ui.find_children("*", "Control", true, false).filter(func(c): return c.get_script() == Header and c.is_visible_in_tree())

func run():
	root.gui_embed_subwindows = true
	if not OS.get_cmdline_user_args().is_empty(): output = OS.get_cmdline_user_args()[0]
	root.size = Vector2i(432,1008)
	ui = load("res://scenes/main.tscn").instantiate()
	ui.session = preload("res://tests/campaign_driver.gd").new(ui.data)
	ui.saves = MemorySaves.new()
	ui.preferences = MemoryPreferences.new()
	root.add_child(ui)
	ui.session.combat.rng.seed = 43
	ui.session.create("Зая", {"strength":3,"agility":2,"vitality":1,"intelligence":1}, ui.data.portraits[0].id)
	ui.hero_id = "header-memory-preview"
	ui.session.game.souls = 124580
	ui.session.game.journey.mapPreset = "steppe"
	# Use an actual catalog ID regardless of future map naming changes.
	if ui.data.lookup(ui.data.maps, "steppe").is_empty(): ui.session.game.journey.mapPreset = ui.data.maps[0].id
	ui.show_game()
	await settle()
	var journey = ui.journey_view
	var state = ui.session.game.duplicate(true)
	var rng = ui.session.combat.rng.state
	var shared_bounds: Dictionary = {}
	for pixels in SIZES:
		root.size = pixels
		await settle()
		inspect(journey.header)
		shared_bounds[pixels] = journey.header.get_global_rect()
		check(ui.journey_view == journey and not ui.scroll.visible, "Fold keeps same unscrolled map")
		check(journey.header.get_rect().end.y < journey.map_view.position.y, "Map starts below complete header")
		if pixels == Vector2i(432,1008): await shot("map-portrait")
		if pixels == Vector2i(896,800): await shot("map-fold")
		if pixels == Vector2i(2240,900): await shot("map-ultrawide")
	check(ui.session.game == state and ui.session.combat.rng.state == rng, "Folding does not change saved journey/RNG")
	journey.header.player_portrait.pressed.emit()
	await settle()
	check(is_instance_valid(ui.character_window), "Portrait still opens tabs")
	ui.character_window.close()
	await settle()
	ui.session.travel("fight-1")
	ui.show_game()
	await settle()
	var combat = ui.combat_view
	var draft = ui.draft.duplicate(true)
	state = ui.session.game.duplicate(true)
	rng = ui.session.combat.rng.state
	# Use controlled calculation values to see both forecast layers in screenshots.
	var forecast = {"cost":{"remaining":5},"calculation":{"player":{"damage":4,"staminaLoss":1},"enemy":{"damage":12,"available":7,"staminaLoss":2}}}
	for pixels in SIZES:
		root.size = pixels
		combat.header.configure(ui.data, ui.session.game, false, forecast)
		await settle()
		inspect(combat.header)
		check(combat.header.get_global_rect() == shared_bounds[pixels], "Map and combat header bounds match")
		if combat.columns == 2:
			var block = combat.board.get_global_rect().merge(combat.hand.get_global_rect())
			check(absf(block.position.x - combat.header.global_position.x) <= 1 and absf(block.size.x - combat.header.size.x) <= 1, "Wide header follows actual board and hand width")
		check(combat.header.bars[0].forecast_change == -4 and combat.header.bars[2].forecast_change == -12, "Both sides display supplied calculation")
		check(combat.header.bars[1].displayed_value == 5 and combat.header.bars[1].forecast_change == -1, "Placement cost stays separate from incoming stamina loss")
		check(combat.header.get_rect().end.y < combat.board.position.y, "Complete combat header above board")
		if pixels == Vector2i(432,1008): await shot("combat-portrait")
		if pixels == Vector2i(896,800): await shot("combat-fold")
		if pixels == Vector2i(2240,900): await shot("combat-ultrawide")
	check(ui.session.game == state and ui.draft == draft and ui.session.combat.rng.state == rng, "Rendering forecast/folding does not change battle/draft/RNG")
	# Direct narrow-width stress, unaffected by project's logical viewport scaling.
	var stress = Header.new()
	root.add_child(stress)
	stress.theme = ui.theme
	var game = ui.session.game.duplicate(true)
	game.journey.expedition = 123456789
	game.player.stats.vitality = 999
	game.player.hp = ui.data.max_hp(game.player)
	game.souls = 9876543210
	stress.title_override = "Очень длинное название каменистой тропы в северных степях"
	for width in [280,320,444,800,1800]:
		stress.size = Vector2(width,Header.HEIGHT)
		stress.configure_journey(ui.data,game,false)
		await settle()
		line_fits(stress.title)
		line_fits(stress.map_number)
		line_fits(stress.bars[0].value_label)
		if width == 280: check(stress.title.fitted_font_size < stress.TITLE_SIZE, "Long title shrinks instead of wrapping/cropping")
	stress.queue_free()
	# Reuse on result screens, including updates after opening character tabs.
	for phase in ["victory","defeat","draw"]:
		ui.session.game.phase = phase
		if phase == "victory": ui.session.finish_battle()
		ui.show_game()
		await settle()
		var headers = page_headers()
		var expected_title = "Победа" if phase == "victory" else ui.phase_name(phase)
		check(headers.size() == 1, "Exactly one shared header on " + phase)
		check(headers[0].title.text == expected_title, "Result title inside header")
		ui.session.game.souls += 1
		ui.refresh_character_header()
		check(headers[0].shards.amount == ui.session.game.souls and headers[0].title.text == expected_title, "Balance refresh preserves result title")
		var result_state = ui.session.game.duplicate(true)
		var result_rng = ui.session.combat.rng.state
		for pixels in SIZES:
			root.size = pixels
			await settle()
			inspect(headers[0])
			check(headers[0].get_global_rect() == shared_bounds[pixels], "Result width matches map/combat at the same resolution")
			check(ui.content.size.x <= headers[0].size.x + 1, "Result content remains within the shared header width")
			check(ui.page_header_view == headers[0] and ui.session.game == result_state and ui.session.combat.rng.state == result_rng, "Resizing " + phase + " keeps header, state and RNG")
			check(ui.scroll.get_global_rect().position.y > headers[0].get_global_rect().end.y, "Body scroll starts below fixed result header")
			if pixels in [Vector2i(432,1008),Vector2i(896,800),Vector2i(2240,900)]: await shot("%s-%dx%d" % [phase,pixels.x,pixels.y])
	var forge = {}
	for seed_value in range(1, 15):
		ui.session.combat.rng.seed = seed_value
		ui.session.map_fixture(1)
		for node in ui.session.game.journey.map.nodes:
			if node.kind == "forge": forge = node; break
		if not forge.is_empty(): break
	check(not forge.is_empty(), "Forge fixture available")
	ui.session.game.journey.path = [forge.id]
	ui.session.game.journey.forgeResolved = false
	ui.session.game.journey.awaitingFirstBattle = false
	ui.session.game.journey.offers = ui.data.items.filter(func(item): return not item.get("unarmed", false)).slice(0,3).map(func(item): return item.id)
	ui.session.service_fixture(forge, ui.session.game.journey.offers)
	ui.show_game()
	await settle()
	var forge_headers = page_headers()
	check(forge_headers.size() == 1 and forge_headers[0].title.text == "Кузница", "Forge uses same header with title inside")
	for pixels in SIZES:
		root.size = pixels
		await settle()
		inspect(forge_headers[0])
		check(forge_headers[0].get_global_rect() == shared_bounds[pixels], "Forge width matches map/combat at the same resolution")
		var fixed_header = forge_headers[0].get_global_rect()
		ui.scroll.scroll_vertical = 10000
		await settle()
		check(forge_headers[0].get_global_rect() == fixed_header, "Scrolling forge offers never moves or shrinks header")
		ui.scroll.scroll_vertical = 0
		if pixels in [Vector2i(432,1008),Vector2i(896,800),Vector2i(2240,900)]: await shot("forge-%dx%d" % [pixels.x,pixels.y])
	# Ensure this also holds for a long body, even when the current offers happen to fit.
	var overflow = Control.new()
	overflow.custom_minimum_size.y = ui.scroll.size.y + 200
	ui.content.add_child(overflow)
	await settle()
	var forge_frame = forge_headers[0].get_global_rect()
	ui.scroll.scroll_vertical = 10000
	await settle()
	check(ui.scroll.scroll_vertical > 0 and forge_headers[0].get_global_rect() == forge_frame, "Long forge body scrolls independently of the header and its shadow")
	overflow.queue_free()
	ui.scroll.scroll_vertical = 0
	# Uneven display cutouts must affect every header identically and preserve its shadow.
	ui.margin.add_theme_constant_override("margin_left", 54)
	ui.margin.add_theme_constant_override("margin_top", 32)
	await settle()
	inspect_placement(forge_headers[0])
	forge_headers[0].mode_icon.pressed.emit()
	await settle()
	check(ui.get_children().any(func(c): return c is ModalDialog and c.visible), "Mode icon still opens menu")
	for child in ui.get_children():
		if child is ModalDialog: child.queue_free()
	ui.show_home()
	await settle()
	check(page_headers().is_empty(), "Game header does not leak into the home screen")
	ui.margin.add_theme_constant_override("margin_left", Layout.PADDING)
	ui.margin.add_theme_constant_override("margin_top", Layout.PADDING)
	for spec in [["home",ui.show_home],["heroes",ui.show_heroes],["create",ui.show_create],["settings",ui.show_settings],["rules",ui.show_rules],["bestiary",func(): ui.show_debug_catalog(true)],["equipment",func(): ui.show_debug_catalog(false)]]:
		spec[1].call()
		for pixels in [Vector2i(432,1008),Vector2i(2240,900)]:
			root.size = pixels
			await settle()
			var reference = shared_bounds[pixels]
			var active_page = ui.creation_view if is_instance_valid(ui.creation_view) else ui.page
			if is_instance_valid(ui.heroes_view): active_page = ui.heroes_view
			check(absf(active_page.global_position.x - reference.position.x) <= 1 and absf(active_page.size.x - reference.size.x) <= 1, "Same centered frame on " + spec[0])
			if is_instance_valid(ui.creation_view):
				check(ui.creation_view.panel.size.x <= active_page.size.x + 1, "Creation window stays inside shared bounds")
			elif is_instance_valid(ui.heroes_view):
				check(ui.heroes_view.panel.size.x <= active_page.size.x + 1, "Hero list stays inside shared bounds")
			else: check(ui.content.size.x <= active_page.size.x + 1, "Body stays inside frame on " + spec[0])
			check(ui.backdrop.size == ui.size, "Background still fills the window on " + spec[0])
			if pixels == Vector2i(2240,900): await shot(spec[0] + "-ultrawide")
	print("GAME_HEADER: %s (%d checks; %d failures)" % ["PASS" if failures.is_empty() else "FAIL",checks,failures.size()])
	quit(0 if failures.is_empty() else 1)
