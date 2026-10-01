extends "res://scripts/preview_portraits.gd"
## Memory-only fixtures for reviewing production buttons.
func run():
	root.size = Vector2i(460,820)
	var args = OS.get_cmdline_user_args()
	var mode = args[0] if not args.is_empty() else "home"
	if mode == "comparison":
		await open_mode("victory")
		ui.show_reward_details(0)
	elif mode == "combat-help":
		await open_mode("combat")
		ui.show_combat_help(true)
	elif mode in MODES:
		await open_mode(mode)
	else:
		await open_mode("creation" if mode.begins_with("creation-") else "hero")
		match mode:
			"home": ui.show_home()
			"creation-attributes", "creation-difficulty":
				ui.creation_view.step = 1 if mode == "creation-attributes" else 2
				ui.creation_view.refresh()
			"attributes", "equipment", "menu": ui.character_window.select_tab({"attributes":1,"equipment":2,"menu":3}[mode])
			"item": ui.show_item_details("dagger")
			"skill": ui.show_skill_details(ui.data.skills[0].id)
			"catalog": ui.show_debug_catalog(false)
			"skills": ui.show_skills_catalog()
			"delete-dialog":
				ui.show_heroes()
				var dialog = preload("res://ui/modal_dialog.gd").new()
				dialog.title = "Удалить героя?"
				dialog.dialog_text = "Весь прогресс героя будет потерян.\nЭто тестовое окно: сохранения не меняются."
				dialog.destructive = true
				dialog.ok_button_text = "Удалить"
				dialog.cancel_button_text = "Отмена"
				ui.add_child(dialog)
				dialog.popup_centered()
		root.title = "Орвеск — " + mode + " (превью кнопок)"
	print("BUTTON_SCREEN_READY: " + mode)
