import pytest
from unittest.mock import patch


def test_settings_load_from_env():
    """環境変数からすべての必須フィールドを読み込めること"""
    env_vars = {
        "DATABASE_URL": "postgresql+asyncpg://user:pass@host:5432/db",
        "DISCORD_CLIENT_ID": "test_client_id",
        "DISCORD_CLIENT_SECRET": "test_client_secret",
        "DISCORD_REDIRECT_URI": "http://localhost:8000/auth/discord/callback",
        "JWT_SECRET": "test_secret_key_that_is_long_enough",
        "FRONTEND_URL": "http://localhost:5173",
        "APP_ENV": "development",
    }
    with patch.dict("os.environ", env_vars, clear=True):
        import importlib
        import app.config as config_module
        importlib.reload(config_module)
        settings = config_module.Settings()

        assert settings.database_url == env_vars["DATABASE_URL"]
        assert settings.discord_client_id == env_vars["DISCORD_CLIENT_ID"]
        assert settings.app_env == "development"


def test_settings_app_env_default():
    """APP_ENV が未設定のとき development がデフォルトであること"""
    env_vars = {
        "DATABASE_URL": "postgresql+asyncpg://user:pass@host:5432/db",
        "DISCORD_CLIENT_ID": "id",
        "DISCORD_CLIENT_SECRET": "secret",
        "DISCORD_REDIRECT_URI": "http://localhost:8000/auth/discord/callback",
        "JWT_SECRET": "secret_key",
        "FRONTEND_URL": "http://localhost:5173",
    }
    with patch.dict("os.environ", env_vars, clear=True):
        import importlib
        import app.config as config_module
        importlib.reload(config_module)
        settings = config_module.Settings()

        assert settings.app_env == "development"
