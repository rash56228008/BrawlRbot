// Обёртка над Telegram WebApp API с fallback для обычного браузера
export function tgInit() {
  const webApp = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  const isTelegram = !!webApp && webApp.platform !== 'unknown';

  if (webApp) {
    try {
      webApp.ready();
      webApp.expand();
      if (webApp.setHeaderColor) webApp.setHeaderColor('#1a1233');
      if (webApp.setBackgroundColor) webApp.setBackgroundColor('#1a1233');
    } catch (e) { console.warn('tg ready failed', e); }
  }

  const cloudGet = (key) => new Promise((resolve) => {
    if (isTelegram && webApp.CloudStorage && webApp.CloudStorage.getItem) {
      try {
        webApp.CloudStorage.getItem(key, (err, value) => resolve(err ? null : value));
        return;
      } catch (e) { /* fallthrough */ }
    }
    resolve(localStorage.getItem(key));
  });

  const cloudSet = (key, value) => new Promise((resolve) => {
    if (isTelegram && webApp.CloudStorage && webApp.CloudStorage.setItem) {
      try {
        webApp.CloudStorage.setItem(key, value, (err) => {
          if (err) localStorage.setItem(key, value);
          resolve(!err);
        });
        return;
      } catch (e) { /* fallthrough */ }
    }
    localStorage.setItem(key, value);
    resolve(true);
  });

  const user = (webApp && webApp.initDataUnsafe && webApp.initDataUnsafe.user) || null;

  return {
    webApp,
    isTelegram,
    user,
    cloudGet,
    cloudSet,
    // Безопасное закрытие / кнопка назад
    onBackPressed(cb) {
      if (isTelegram && webApp.BackButton && webApp.BackButton.onClick) {
        webApp.BackButton.show();
        webApp.BackButton.onClick(cb);
      }
    },
    hideBack() {
      if (isTelegram && webApp.BackButton && webApp.BackButton.hide) webApp.BackButton.hide();
    },
    haptic(type = 'light') {
      if (isTelegram && webApp.HapticFeedback && webApp.HapticFeedback.impactOccurred) {
        try { webApp.HapticFeedback.impactOccurred(type); } catch (e) {}
      }
    }
  };
}
