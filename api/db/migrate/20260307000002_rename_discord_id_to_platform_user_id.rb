class RenameDiscordIdToPlatformUserId < ActiveRecord::Migration[7.1]
  def change
    rename_column :users, :discord_id, :platform_user_id
  end
end
