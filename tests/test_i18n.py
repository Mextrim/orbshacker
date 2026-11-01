"""Tests for i18n.py – Internationalization and translations."""

import pytest

from orbshacker.i18n import (
    DEFAULT_LANGUAGE,
    LANGUAGES,
    TRANSLATIONS,
    detect_system_language,
    get_current_language,
    init_language_from_config,
    set_language,
    t,
)


def test_supported_languages_list():
    assert "en" in LANGUAGES
    assert "ru" in LANGUAGES
    assert "es" in LANGUAGES
    assert "pt" in LANGUAGES
    assert "de" in LANGUAGES
    assert "fr" in LANGUAGES


def test_set_and_get_language():
    orig = get_current_language()
    try:
        assert set_language("ru", save_to_settings=False) is True
        assert get_current_language() == "ru"
        assert set_language("es", save_to_settings=False) is True
        assert get_current_language() == "es"
        # Invalid language
        assert set_language("klingon", save_to_settings=False) is False
        assert get_current_language() == "es"
    finally:
        set_language(orig, save_to_settings=False)


def test_translation_lookup():
    orig = get_current_language()
    try:
        set_language("en", save_to_settings=False)
        assert t("menu_title") == "MAIN MENU"

        set_language("ru", save_to_settings=False)
        assert t("menu_title") == "ГЛАВНОЕ МЕНЮ"

        set_language("es", save_to_settings=False)
        assert t("menu_title") == "MENÚ PRINCIPAL"

        set_language("pt", save_to_settings=False)
        assert t("menu_title") == "MENU PRINCIPAL"

        set_language("de", save_to_settings=False)
        assert t("menu_title") == "HAUPTMENÜ"

        set_language("fr", save_to_settings=False)
        assert t("menu_title") == "MENU PRINCIPAL"
    finally:
        set_language(orig, save_to_settings=False)


def test_translation_with_formatting():
    orig = get_current_language()
    try:
        set_language("en", save_to_settings=False)
        assert t("db_total_avail", count=42) == "Total games available: 42"

        set_language("ru", save_to_settings=False)
        assert t("db_total_avail", count=42) == "Всего игр доступно: 42"
    finally:
        set_language(orig, save_to_settings=False)


def test_fallback_to_english():
    orig = get_current_language()
    try:
        set_language("fr", save_to_settings=False)
        # Even if a key didn't exist in French, it would fall back to English
        assert t("menu_title") is not None
        # Non-existent key returns key itself
        assert t("non_existent_key_12345") == "non_existent_key_12345"
    finally:
        set_language(orig, save_to_settings=False)


def test_detect_system_language(monkeypatch):
    monkeypatch.setenv("LANG", "ru_RU.UTF-8")
    assert detect_system_language() == "ru"

    monkeypatch.setenv("LANG", "es_ES.UTF-8")
    assert detect_system_language() == "es"

    monkeypatch.setenv("LANG", "de_DE.UTF-8")
    assert detect_system_language() == "de"

    monkeypatch.setenv("LANG", "fr_FR.UTF-8")
    assert detect_system_language() == "fr"

    monkeypatch.setenv("LANG", "pt_BR.UTF-8")
    assert detect_system_language() == "pt"

    monkeypatch.setenv("LANG", "ja_JP.UTF-8")
    assert detect_system_language() == DEFAULT_LANGUAGE


def test_all_languages_have_essential_keys():
    essential_keys = [
        "menu_title",
        "opt_database",
        "opt_manual",
        "opt_steam",
        "opt_quests",
        "opt_credits",
        "opt_language",
        "opt_exit",
        "select_option",
        "confirm_prompt",
        "db_title",
        "manual_title",
        "steam_title",
        "quests_title",
        "dash_title",
        "lang_title",
    ]
    for lang_code in LANGUAGES:
        lang_dict = TRANSLATIONS.get(lang_code, {})
        for key in essential_keys:
            assert key in lang_dict, f"Missing key '{key}' in language '{lang_code}'"
