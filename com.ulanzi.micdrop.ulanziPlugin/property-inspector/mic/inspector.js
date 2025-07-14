// Property Inspector for Mic Drop action
// Reveals the UI wrapper; no user-configurable settings.

$UD.connect('com.ulanzi.micdrop');

$UD.onConnected(() => {
  document.querySelector('.udpi-wrapper').classList.remove('hidden');
});