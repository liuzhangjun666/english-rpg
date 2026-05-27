function modeFromPracticeType(type: string): string {
  if (type === 'listening') return 'listening';
  if (type === 'speaking') return 'speaking';
  if (type === 'writing') return 'writing';
  if (type === 'vocab') return 'vocab';
  return 'vocab';
}

class LegacyBridge {
  private game: any | null = null;
  private loadingGame: Promise<any> | null = null;
  private pendingProfile: Record<string, any> | null = null;

  private applySessionToGame(game: any, profile: Record<string, any> | null) {
    const token = game.api.getStoredToken();
    if (token) {
      game.api.setToken(token);
    }

    if (!profile) return;

    game.store.setUser(profile);
    game.hydrateStoryState(profile);
    game.isLoggedIn = true;
  }

  private async loadGame() {
    if (this.game) return this.game;
    if (this.loadingGame) return this.loadingGame;

    this.loadingGame = import('../../main.js').then((mod: any) => {
      const game = mod.ensureLegacyGame({ autoInit: false });
      game.navigateIfNeeded = () => {};
      game.enterHall = async () => {
        await this.switchToHall();
        window.dispatchEvent(new CustomEvent('legacy:enterHall'));
      };
      this.applySessionToGame(game, this.pendingProfile);
      game.ensureSceneInitialized();
      this.game = game;
      this.loadingGame = null;
      return game;
    });

    return this.loadingGame;
  }

  async getGame() {
    if (!this.game) {
      await this.loadGame();
    }
    return this.game;
  }

  async getApi() {
    const game = await this.getGame();
    return game.api;
  }

  async applySessionFromProfile(profile: Record<string, any>) {
    this.pendingProfile = profile;
    if (this.game) {
      this.applySessionToGame(this.game, this.pendingProfile);
    }
  }

  async clearSession() {
    this.pendingProfile = null;
    if (!this.game) return;
    const game = await this.getGame();
    game.isLoggedIn = false;
    game.store.setUser(null);
    game.store.setStoryProgress(null);
    game.store.setProgressCurrencies(null);
    game.ui.hideAllPanels();
    const bar = document.getElementById('character-bar');
    if (bar) bar.remove();
    game.api.clearToken();
  }

  async switchToHall() {
    const game = await this.getGame();
    this.applySessionToGame(game, this.pendingProfile);
    game.ensureSceneInitialized();
    await game.syncDailyStatus();
    await game.scene.switchTo('hall');
    game.ui.hideAllPanels();
  }

  async openPracticePanel(type = 'vocab') {
    const game = await this.getGame();
    this.applySessionToGame(game, this.pendingProfile);
    game.ensureSceneInitialized();
    await game.scene.switchTo('practice', { mode: modeFromPracticeType(type) });
    game.ui.hideAllPanels();
    const panel = await game.loadPanel('practice');
    panel.showLevelSelect(type);
  }

  async switchToPracticeScene(type = 'vocab') {
    const game = await this.getGame();
    this.applySessionToGame(game, this.pendingProfile);
    game.ensureSceneInitialized();
    await game.scene.switchTo('practice', { mode: modeFromPracticeType(type) });
    game.ui.hideAllPanels();
  }

  async openReadingAdventure() {
    const game = await this.getGame();
    this.applySessionToGame(game, this.pendingProfile);
    await game.startPracticeModule('reading');
  }

  async switchToReadingScene() {
    const game = await this.getGame();
    this.applySessionToGame(game, this.pendingProfile);
    game.ensureSceneInitialized();
    await game.scene.switchTo('cangjingge');
    game.ui.hideAllPanels();
  }

  async openExam() {
    const game = await this.getGame();
    this.applySessionToGame(game, this.pendingProfile);
    game.goToScene('shilianchang');
  }

  async switchToExamScene() {
    const game = await this.getGame();
    this.applySessionToGame(game, this.pendingProfile);
    game.ensureSceneInitialized();
    await game.scene.switchTo('shilianchang');
    game.ui.hideAllPanels();
  }

  async openMijing() {
    const game = await this.getGame();
    this.applySessionToGame(game, this.pendingProfile);
    game.goToScene('mijing');
  }

  async switchToMijingScene() {
    const game = await this.getGame();
    this.applySessionToGame(game, this.pendingProfile);
    game.ensureSceneInitialized();
    await game.scene.switchTo('mijing');
    game.ui.hideAllPanels();
  }

  async openMall() {
    const game = await this.getGame();
    this.applySessionToGame(game, this.pendingProfile);
    await game.showMall();
  }

  async openLeaderboard() {
    const game = await this.getGame();
    this.applySessionToGame(game, this.pendingProfile);
    await game.showLeaderboard();
  }

  async openReview() {
    const game = await this.getGame();
    this.applySessionToGame(game, this.pendingProfile);
    await game.startReview();
  }

  async openDemons() {
    const game = await this.getGame();
    this.applySessionToGame(game, this.pendingProfile);
    await game.showDemons();
  }

  async openAchievements() {
    const game = await this.getGame();
    this.applySessionToGame(game, this.pendingProfile);
    await game.showAchievements();
  }

  async closeLegacyPanels() {
    const game = await this.getGame();
    game.ui.hideAllPanels();
  }

  async openProfilePanel() {
    const game = await this.getGame();
    this.applySessionToGame(game, this.pendingProfile);
    game.ui.showProfilePanel();
  }
}

const singleton = new LegacyBridge();

export function useLegacyBridge() {
  return singleton;
}
