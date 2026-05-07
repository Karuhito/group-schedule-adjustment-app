from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
  model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

  database_url: str
  discord_client_id: str
  discord_client_secret: str
  discord_redirect_uri: str
  jwt_secret: str
  frontend_url: str
  app_env: str = "development"


settings = Settings()
