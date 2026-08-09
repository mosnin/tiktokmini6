// Single seam between the game and the TikTok Mini Games SDK (TTMinis.game).
// Everything platform-specific goes through here so the browser build keeps
// working and the real SDK drops in without touching game code.
const tt = () => (typeof TTMinis !== 'undefined' ? TTMinis.game : null)

export const platform = {
  async login() {
    const sdk = tt()
    if (!sdk) return { guest: true } // browser dev fallback
    return new Promise(res => sdk.login({ success: res, fail: () => res({ guest: true }) }))
  },

  // Rewarded ad: resolves true when the reward should be granted.
  async showRewardedAd() {
    const sdk = tt()
    if (!sdk) return null // signal caller to use the stub modal
    return new Promise(res => {
      const ad = sdk.createRewardedVideoAd({ adUnitId: 'REWARDED_AD_UNIT_ID' })
      ad.onClose(r => res(!!(r && r.isEnded)))
      ad.show().catch(() => ad.load().then(() => ad.show())).catch(() => res(false))
    })
  },

  async showInterstitialAd() {
    const sdk = tt()
    if (!sdk) return null
    return new Promise(res => {
      const ad = sdk.createInterstitialAd({ adUnitId: 'INTERSTITIAL_AD_UNIT_ID' })
      ad.onClose(() => res(true))
      ad.show().catch(() => res(false))
    })
  },

  share(depth) {
    const sdk = tt()
    if (!sdk) return
    sdk.shareAppMessage({ title: `I reached B${depth} in Depth Charge! Can you go deeper?` })
  },

  addShortcut() { tt()?.addShortcut?.({}) }, // "Add to desk" — mandatory TikTok feature
}
