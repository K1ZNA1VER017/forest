/** Original local synthesis loops. Browser autoplay is only started from Sound button. */
export class Music {
  private tracks = new Map<string, HTMLAudioElement>();
  private enabled = false;
  set(enabled: boolean) {
    this.enabled = enabled;
    for (const a of this.tracks.values()) {
      if (!enabled) a.pause();
      else a.play().catch(() => {});
    }
  }
  update(zone: string, inCombat: boolean) {
    if (!this.enabled) return;
    const key = inCombat
      ? "combat"
      : zone === "hub"
        ? "hub"
        : zone === "abyss"
          ? "abyss"
          : "forest";
    if (!this.tracks.has(key)) {
      const a = new Audio(`/audio/${key}.wav`);
      a.loop = true;
      a.volume = 0;
      this.tracks.set(key, a);
      a.play().catch(() => {});
    }
    for (const [k, a] of this.tracks) {
      const target = k === key ? 0.22 : 0;
      a.volume += (target - a.volume) * 0.06;
    }
  }
}
